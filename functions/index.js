/**
 * Unif1 / MyPortalOne Backend Functions
 * Environment: Production Ready (V2)
 * Region: asia-northeast1 (Tokyo)
 */

const functions = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const { getAllPoints } = require("./weatherPoints");

// --- 1. 初期化と設定 ---
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// 全関数を東京リージョンに固定
setGlobalOptions({ region: "asia-northeast1" });

// Secret Managerの定義（コード上にキーを書かない安全策）
const stripeSecret = defineSecret("STRIPE_SECRET");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Stripeクライアントの初期化ヘルパー
const getStripe = () => require("stripe")(stripeSecret.value());

// --- 2. 決済セッション作成 (6つのプラン対応版) ---
exports.createCheckoutSession = onCall(
  { secrets: [stripeSecret] }, // シークレットへのアクセス権を付与
  async (request) => {
    // 認証ガード
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "セキュリティエラー: ログインが必要です。"
      );
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email;

    // フロントエンドから origin と priceId (選んだプランのID) を受け取る
    const { origin, priceId } = request.data;

    // バリデーション: IDが送られてきているか、形式が正しいかチェック
    if (!priceId || !priceId.startsWith("price_")) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "無効なプランIDです。"
      );
    }

    const stripe = getStripe();

    try {
      // 顧客検索 & 作成
      const usersRef = db.collection("users").doc(uid);
      const userSnap = await usersRef.get();
      let customerId = userSnap.data()?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: email,
          metadata: { firebaseUid: uid },
        });
        customerId = customer.id;
        await usersRef.set({ stripeCustomerId: customerId }, { merge: true });
      }

      // セッション作成
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/?payment=success`,
        cancel_url: `${origin}/?payment=cancel`,
        metadata: { firebaseUid: uid },
        allow_promotion_codes: true, // クーポンも使えるようにしておく
      });

      return { url: session.url };
    } catch (error) {
      console.error(`[Stripe Error] User: ${uid}`, error);
      throw new functions.https.HttpsError(
        "internal",
        "決済システムの初期化に失敗しました。"
      );
    }
  }
);

// --- 2.1 カスタマーポータルセッション作成 ---
exports.createPortalSession = onCall(
  { region: "asia-northeast1", secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "ログインしてから操作してください。"
      );
    }

    const uid = request.auth.uid;
    const { returnUrl } = request.data || {};

    if (!returnUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "returnUrl が指定されていません。"
      );
    }

    const userSnap = await db.collection("users").doc(uid).get();
    const customerId = userSnap.data()?.stripeCustomerId;

    if (!customerId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe 顧客情報が見つかりません。"
      );
    }

    const stripe = getStripe();

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error) {
      console.error(`[Portal Session Error] User: ${uid}`, error);
      throw new functions.https.HttpsError(
        "internal",
        "カスタマーポータルへの遷移に失敗しました。"
      );
    }
  }
);

// --- 3. Webhook (安全に通知を受け取る) ---
exports.stripeWebhook = onRequest(
  { secrets: [stripeWebhookSecret] },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const stripe = getStripe();

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      console.error(`[Webhook Signature Error]`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // イベント処理
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const uid = session.metadata.firebaseUid;

        if (uid) {
          console.log(`[Payment Success] Granting premium to: ${uid}`);
          await db.collection("users").doc(uid).set(
            {
              isPremium: true,
              stripeCustomerId: session.customer,
              subscriptionId: session.subscription,
              lastPaymentStatus: "paid",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }
    } catch (error) {
      console.error(`[Webhook Processing Error]`, error);
      return res.status(500).send("Internal Server Error");
    }

    res.json({ received: true });
  }
);

// --- 4. 天気キャッシュ更新 (定期実行) ---
exports.updateWeatherCache = onSchedule(
  {
    schedule: "every 60 minutes",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (event) => {
    console.log("[Batch Start] Updating weather cache...");
    try {
      const points = getAllPoints();
      const batch = db.batch();
      const weatherCollection = db.collection("weather_cache");
      const chunkSize = 5;

      for (let i = 0; i < points.length; i += chunkSize) {
        const chunk = points.slice(i, i + chunkSize);

        const promises = chunk.map(async (point) => {
          try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo`;
            const res = await axios.get(url, { timeout: 5000 });
            const data = res.data;

            const payload = {
              id: point.id,
              name: point.name,
              lat: point.lat,
              lon: point.lon,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              today: {
                code: data.daily.weathercode[0],
                tempMax: data.daily.temperature_2m_max[0],
                tempMin: data.daily.temperature_2m_min[0],
                rainProb: data.daily.precipitation_probability_max[0],
              },
              tomorrow: {
                code: data.daily.weathercode[1],
                tempMax: data.daily.temperature_2m_max[1],
                tempMin: data.daily.temperature_2m_min[1],
                rainProb: data.daily.precipitation_probability_max[1],
              },
            };
            batch.set(weatherCollection.doc(point.id), payload);
          } catch (error) {
            console.error(`[Weather API Error] ${point.name}:`, error.message);
          }
        });

        await Promise.all(promises);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      await batch.commit();
      console.log("[Batch Complete] Weather cache updated.");
    } catch (error) {
      console.error("[Batch Fatal Error]", error);
    }
  }
);
