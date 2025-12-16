const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { onCall, onRequest } = require("firebase-functions/v2/https"); // v2系のhttpsを使う
const functions = require("firebase-functions"); // v1系もエラー用に残す
const admin = require("firebase-admin");
const axios = require("axios");
const { getAllPoints } = require("./weatherPoints");

// --- 1. 初期化 ---
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// ★重要: ここですべての関数を東京リージョンに設定します
setGlobalOptions({ region: "asia-northeast1" });

// --- 2. Stripe設定 ---
// ★ここにシークレットキーを入れてください
const stripe = require("stripe")("sk_test_あなたのシークレットキー");

// --- 3. Stripe: チェックアウトセッション作成 (v2) ---
exports.createCheckoutSession = onCall(async (request) => {
  // v2では request.auth, request.data でアクセスします
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "ログインが必要です"
    );
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email;
  const data = request.data;

  // ★ここに作成した商品のPrice IDを入れてください
  const priceId = "price_あなたのプライスID";

  try {
    // 顧客作成
    const customer = await stripe.customers.create({
      email: email,
      metadata: { firebaseUid: uid },
    });

    // セッション作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${data.origin}/?payment=success`,
      cancel_url: `${data.origin}/?payment=cancel`,
      metadata: { firebaseUid: uid },
    });

    return { url: session.url };
  } catch (error) {
    console.error("Stripe Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// --- 4. Stripe: Webhook (v2) ---
exports.stripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];

  // ★ここにWebhook署名シークレットを入れてください
  const endpointSecret = whsec_JDy8aJhAuq5pqe7UJvOvTZE10uxzsjXL;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // イベント処理
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const uid = session.metadata.firebaseUid;

    if (uid) {
      console.log(`Payment success for UID: ${uid}`);
      await db.collection("users").doc(uid).set(
        {
          isPremium: true,
          stripeCustomerId: session.customer,
          subscriptionId: session.subscription,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  res.json({ received: true });
});

// --- 5. 天気キャッシュ更新 (定期実行) ---
exports.updateWeatherCache = onSchedule(
  {
    schedule: "every 60 minutes",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (event) => {
    const points = getAllPoints();
    console.log(`開始: 対象地点数 ${points.length}箇所`);

    const batch = db.batch();
    const weatherCollection = db.collection("weather_cache");
    const chunkSize = 5;

    for (let i = 0; i < points.length; i += chunkSize) {
      const chunk = points.slice(i, i + chunkSize);

      const promises = chunk.map(async (point) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo`;

          const res = await axios.get(url);
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

          const docRef = weatherCollection.doc(point.id);
          batch.set(docRef, payload);
        } catch (error) {
          console.error(
            `Error fetching ${point.name} (${point.id}):`,
            error.message
          );
        }
      });

      await Promise.all(promises);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await batch.commit();
    console.log("全地点の天気更新完了");
  }
);
