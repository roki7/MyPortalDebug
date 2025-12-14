// weatherPoints.js

// 1. ベースとなる47都道府県庁所在地（無料会員・有料会員共通）
const capitals = [
  { id: "hokkaido", name: "札幌", lat: 43.0642, lon: 141.3469 },
  { id: "aomori", name: "青森", lat: 40.8244, lon: 140.74 },
  { id: "iwate", name: "盛岡", lat: 39.7036, lon: 141.1564 },
  { id: "miyagi", name: "仙台", lat: 38.2688, lon: 140.8719 },
  // ... (ここに47都道府県すべて記述します。長いので省略しますが、実際は全件書きます)
  { id: "tokyo", name: "東京", lat: 35.6895, lon: 139.6917 },
  { id: "okinawa", name: "那覇", lat: 26.2124, lon: 127.6809 },
];

// 2. メッシュ生成設定（有料会員の精度向上用）
// 日本の主要エリアをカバーするバウンディングボックス
const areas = [
  {
    name: "Hokkaido",
    latMin: 41.5,
    latMax: 45.5,
    lonMin: 139.5,
    lonMax: 145.8,
  },
  {
    name: "Honshu_Main",
    latMin: 33.5,
    latMax: 41.5,
    lonMin: 130.5,
    lonMax: 142.0,
  },
  {
    name: "Kyushu_Shikoku",
    latMin: 31.0,
    latMax: 34.5,
    lonMin: 129.5,
    lonMax: 134.5,
  },
  {
    name: "Okinawa_Islands",
    latMin: 24.0,
    latMax: 27.0,
    lonMin: 123.0,
    lonMax: 128.5,
  },
];

// 約30km間隔（緯度0.27度、経度0.33度くらい）
const STEP_LAT = 0.27;
const STEP_LON = 0.33;

// ポイント生成関数
const generateGridPoints = () => {
  let points = [];
  let count = 0;

  areas.forEach((area) => {
    for (let lat = area.latMin; lat <= area.latMax; lat += STEP_LAT) {
      for (let lon = area.lonMin; lon <= area.lonMax; lon += STEP_LON) {
        // 簡易的な「陸地判定」として、既存の47都道府県のどれかと
        // 「極端に離れていない（例えば200km以内）」ものだけ残すなどのフィルタも可能ですが、
        // ここではシンプルにグリッドを作成します。

        // IDは座標から生成
        const id = `grid_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        points.push({
          id: id,
          name: "周辺エリア", // 表示名はクライアント側で「現在地周辺」などにする
          lat: parseFloat(lat.toFixed(4)),
          lon: parseFloat(lon.toFixed(4)),
          isGrid: true, // グリッド識別用フラグ
        });
      }
    }
  });

  return points;
};

// 3. 合体と重複排除（合計410個以内に調整）
const getAllPoints = () => {
  const grid = generateGridPoints();

  // 47都道府県に近いグリッドは削除して、47都道府県のデータを優先する
  // (半径15km以内のグリッドは削除)
  const filteredGrid = grid.filter((gPoint) => {
    return !capitals.some((cap) => {
      const dist = Math.sqrt(
        Math.pow(gPoint.lat - cap.lat, 2) + Math.pow(gPoint.lon - cap.lon, 2)
      );
      return dist < 0.15; // 約15km
    });
  });

  // 合計リスト（安全マージンを見て先頭から約360個 + 47個に絞る）
  // ※実際にはランダムに間引くか、人口密集地を優先するロジックを入れると良い
  const maxGrid = 363; // 410 - 47
  const finalGrid = filteredGrid.slice(0, maxGrid);

  return [...capitals, ...finalGrid];
};

module.exports = { getAllPoints };
