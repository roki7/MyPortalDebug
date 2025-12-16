// functions/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");
const axios = require("axios");
const { getAllPoints } = require("./weatherPoints");

// 初期化
admin.initializeApp();
const db = admin.firestore();

// 東京リージョンに固定（重要：これをしないと米国サーバーになり遅延します）
setGlobalOptions({ region: "asia-northeast1" });

// 1時間ごとの定期実行関数 (Gen 2 syntax)
exports.updateWeatherCache = onSchedule(
  {
    schedule: "every 60 minutes",
    timeoutSeconds: 540, // 9分（最大値）
    memory: "1GiB", // ★注意: Gen2では "1GB" ではなく "1GiB" と書きます
  },
  async (event) => {
    const points = getAllPoints();
    console.log(`開始: 対象地点数 ${points.length}箇所`);

    const batch = db.batch();
    const weatherCollection = db.collection("weather_cache");

    // 並列処理の塊（チャンク）サイズ
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
      // API制限回避のため少し待機
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await batch.commit();
    console.log("全地点の天気更新完了");
  }
);
