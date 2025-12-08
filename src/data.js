// src/data.js

export const PREFECTURES = [
  { name: '北海道', lat: 43.0642, lon: 141.3469 },
  { name: '青森', lat: 40.8244, lon: 140.74 },
  { name: '岩手', lat: 39.7036, lon: 141.1527 },
  { name: '宮城', lat: 38.2688, lon: 140.8721 },
  { name: '秋田', lat: 39.7186, lon: 140.1024 },
  { name: '山形', lat: 38.2404, lon: 140.3636 },
  { name: '福島', lat: 37.75, lon: 140.4677 },
  { name: '東京', lat: 35.6895, lon: 139.6917 },
  { name: '神奈川', lat: 35.4478, lon: 139.6425 },
  { name: '埼玉', lat: 35.8569, lon: 139.6489 },
  { name: '千葉', lat: 35.6046, lon: 140.1232 },
  { name: '茨城', lat: 36.3418, lon: 140.4468 },
  { name: '栃木', lat: 36.5658, lon: 139.8836 },
  { name: '群馬', lat: 36.3911, lon: 139.0608 },
  { name: '山梨', lat: 35.6639, lon: 138.5683 },
  { name: '新潟', lat: 37.9022, lon: 139.0236 },
  { name: '長野', lat: 36.6513, lon: 138.181 },
  { name: '富山', lat: 36.6953, lon: 137.2113 },
  { name: '石川', lat: 36.5944, lon: 136.6256 },
  { name: '福井', lat: 36.0652, lon: 136.2219 },
  { name: '愛知', lat: 35.1802, lon: 136.9066 },
  { name: '岐阜', lat: 35.3912, lon: 136.7222 },
  { name: '静岡', lat: 34.9769, lon: 138.3831 },
  { name: '三重', lat: 34.7303, lon: 136.5086 },
  { name: '大阪', lat: 34.6863, lon: 135.52 },
  { name: '兵庫', lat: 34.6913, lon: 135.183 },
  { name: '京都', lat: 35.0211, lon: 135.7556 },
  { name: '滋賀', lat: 35.0045, lon: 135.8686 },
  { name: '奈良', lat: 34.6851, lon: 135.8049 },
  { name: '和歌山', lat: 34.226, lon: 135.1675 },
  { name: '鳥取', lat: 35.5036, lon: 134.2383 },
  { name: '島根', lat: 35.4723, lon: 133.0505 },
  { name: '岡山', lat: 34.6618, lon: 133.935 },
  { name: '広島', lat: 34.3963, lon: 132.4594 },
  { name: '山口', lat: 34.1859, lon: 131.4714 },
  { name: '徳島', lat: 34.0657, lon: 134.5593 },
  { name: '香川', lat: 34.3401, lon: 134.0433 },
  { name: '愛媛', lat: 33.8416, lon: 132.7661 },
  { name: '高知', lat: 33.5598, lon: 133.5311 },
  { name: '福岡', lat: 33.6064, lon: 130.418 },
  { name: '佐賀', lat: 33.2493, lon: 130.2988 },
  { name: '長崎', lat: 32.7448, lon: 129.8737 },
  { name: '熊本', lat: 32.7898, lon: 130.7416 },
  { name: '大分', lat: 33.2382, lon: 131.6126 },
  { name: '宮崎', lat: 31.9111, lon: 131.4239 },
  { name: '鹿児島', lat: 31.5602, lon: 130.558 },
  { name: '沖縄', lat: 26.2124, lon: 127.6809 }
];

export const INITIAL_JOBS = [];
export const INITIAL_ACCOUNTS = [];
export const INITIAL_RECURRING = [];
export const INITIAL_PAYMENT_TEMPLATES = [
  { id: 'tpl_1', name: 'コンビニ' },
  { id: 'tpl_2', name: 'スーパー' },
  { id: 'tpl_3', name: '外食' },
  { id: 'tpl_4', name: '交通費' },
  { id: 'tpl_5', name: 'ドラッグストア' }
];
export const INITIAL_MEMBERS = [{ id: 'me', name: '自分', color: '#1976d2' }];
export const INITIAL_SHOPPING = { list: [], stock: [] };
export const INITIAL_SETTINGS = { calcMode: 'realtime', location: PREFECTURES[7], targetLimit: 1030000 };

// --- 頂いた正しいカテゴリ ---
export const LINK_CATEGORIES = [
  { id: 'bank', name: '銀行' },
  { id: 'card', name: 'カード' },
  { id: 'pay', name: 'Pay/電子マネー' },
  { id: 'app', name: 'アプリ' },
  { id: 'shop', name: '通販/店' },
  { id: 'infra', name: '公共料金' },
  { id: 'other', name: 'その他' }
];

// --- 頂いた正しいプリセット ---
export const PRESET_LINKS = [
  { name: 'LINE', url: 'line://', short: 'LINE', cat: 'app' },
  { name: 'Instagram', url: 'instagram://app', short: 'Insta', cat: 'app' },
  { name: 'X(Twitter)', url: 'twitter://', short: 'X', cat: 'app' },
  { name: 'PayPay', url: 'paypay://', short: 'PayPay', cat: 'pay' },
  { name: 'Suica', url: 'suicaapp://', short: 'Suica', cat: 'pay' },
  { name: 'Amazon', url: 'https://www.amazon.co.jp/', short: 'Amazon', cat: 'shop' },
  { name: '楽天市場', url: 'https://www.rakuten.co.jp/', short: '楽天', cat: 'shop' },
  { name: 'Yahoo!', url: 'https://shopping.yahoo.co.jp/', short: 'Yahoo', cat: 'shop' },
  { name: 'メルカリ', url: 'mercari://', short: 'メルカリ', cat: 'shop' },
  { name: '楽天カード', url: 'https://www.rakuten-card.co.jp/e-navi/', short: '楽天C', cat: 'card' },
  { name: '三井住友(Vpass)', url: 'https://www.smbc-card.com/mem/top/index.jsp', short: 'Vpass', cat: 'card' },
  { name: 'JCB(MyJCB)', url: 'https://my.jcb.co.jp/', short: 'JCB', cat: 'card' },
  { name: 'Amex', url: 'https://global.americanexpress.com/login', short: 'Amex', cat: 'card' },
  { name: 'イオンカード', url: 'https://www.aeon.co.jp/', short: 'イオンC', cat: 'card' },
  { name: 'エポスカード', url: 'https://www.eposcard.co.jp/', short: 'エポス', cat: 'card' },
  { name: 'PayPayカード', url: 'https://www.paypay-card.co.jp/', short: 'PayC', cat: 'card' },
  { name: 'dカード', url: 'https://dcard.docomo.ne.jp/', short: 'dカード', cat: 'card' },
  { name: '三菱UFJ', url: 'https://www.bk.mufg.jp/', short: 'MUFG', cat: 'bank' },
  { name: '三井住友銀行', url: 'https://www.smbc.co.jp/', short: 'SMBC', cat: 'bank' },
  { name: 'みずほ', url: 'https://www.mizuhobank.co.jp/', short: 'みずほ', cat: 'bank' },
  { name: 'りそな', url: 'https://www.resonabank.co.jp/', short: 'りそな', cat: 'bank' },
  { name: 'ゆうちょ', url: 'https://www.jp-bank.japanpost.jp/', short: '郵貯', cat: 'bank' },
  { name: '楽天銀行', url: 'https://www.rakuten-bank.co.jp/', short: '楽銀', cat: 'bank' },
  { name: '住信SBI', url: 'https://www.netbk.co.jp/contents/', short: 'SBI', cat: 'bank' },
  { name: 'PayPay銀行', url: 'https://www.paypay-bank.co.jp/', short: 'Pay銀', cat: 'bank' },
  { name: 'ソニー銀行', url: 'https://moneykit.net/', short: 'Sony', cat: 'bank' },
  { name: 'イオン銀行', url: 'https://www.aeonbank.co.jp/', short: 'イオン', cat: 'bank' },
  { name: 'GMOあおぞら', url: 'https://gmo-aozora.com/', short: 'GMO', cat: 'bank' },
  { name: 'セブン銀行', url: 'https://www.sevenbank.co.jp/', short: 'セブン', cat: 'bank' },
  { name: '東京電力', url: 'https://www.kurashi.tepco.co.jp/', short: '東電', cat: 'infra' },
  { name: '東京ガス', url: 'https://my.tokyo-gas.co.jp/', short: '東ガス', cat: 'infra' },
  { name: '大阪ガス', url: 'https://auth.osakagas.co.jp/', short: '大ガス', cat: 'infra' },
  { name: '水道局', url: 'https://www.waterworks.metro.tokyo.lg.jp/', short: '水道', cat: 'infra' },
];

// ★追加: アプリで使える形式に変換してエクスポート
export const INITIAL_MY_LINKS = PRESET_LINKS.map((p, i) => ({
  id: `preset_${i}`,
  title: p.name,
  url: p.url,
  categoryId: p.cat,
  icon: p.short
}));