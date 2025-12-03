// src/data.js

export const LAT = 35.6895;
export const LON = 139.6917;

export const INITIAL_MEMBERS = [
  { id: 'me', name: '自分', color: '#1976d2' },
  { id: 'partner', name: 'パートナー', color: '#ed6c02' }
];

export const INITIAL_SETTINGS = {
  targetLimit: 1030000,
  calcMode: 'realtime',
  location: { name: '東京', lat: 35.6895, lon: 139.6917 }
};

export const INITIAL_JOBS = [];
export const INITIAL_ACCOUNTS = [];
export const INITIAL_RECURRING = [];

// リンクカテゴリ
export const LINK_CATEGORIES = [
  { id: 'bank', name: '銀行' },
  { id: 'card', name: 'カード' },
  { id: 'pay', name: 'Pay/電子マネー' },
  { id: 'app', name: 'アプリ' },
  { id: 'shop', name: '通販/店' },
  { id: 'infra', name: '公共料金' },
  { id: 'other', name: 'その他' }
];

// リンクプリセット
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

export const INITIAL_MY_LINKS = [
  { id: 'link_1', name: 'Amazon', url: 'https://www.amazon.co.jp/', icon: '📦', categoryId: 'shop' },
  { id: 'link_2', name: 'Google', url: 'https://www.google.co.jp/', icon: '🔍', categoryId: 'other' }
];

// ★修正: テンプレート初期値を空に
export const INITIAL_PAYMENT_TEMPLATES = [];

export const INITIAL_SHOPPING = {
  toBuy: [], 
  stock: [
    { id: 's1', name: '牛乳', yomi: 'ぎゅうにゅう', icon: '🥛' },
    { id: 's2', name: '卵', yomi: 'たまご', icon: '🥚' },
    { id: 's3', name: 'パン', yomi: 'ぱん', icon: '🍞' },
    { id: 's4', name: '洗剤', yomi: 'せんざい', icon: '🧴' },
    { id: 's5', name: 'ティッシュ', yomi: 'てぃっしゅ', icon: '🧻' },
    { id: 's6', name: '醤油', yomi: 'しょうゆ', icon: '🍶' },
    { id: 's7', name: 'マヨネーズ', yomi: 'まよねーず', icon: '🌭' }
  ],
  history: [] 
};

// 祝日データ
export const HOLIDAYS_2025 = [
  '2025-01-01', '2025-01-13', '2025-02-11', '2025-02-23', '2025-02-24',
  '2025-03-20', '2025-04-29', '2025-05-03', '2025-05-04', '2025-05-05',
  '2025-05-06', '2025-07-21', '2025-08-11', '2025-09-15', '2025-09-23',
  '2025-10-13', '2025-11-03', '2025-11-23', '2025-11-24'
];

export const PREFECTURES = [
  { name: '北海道 (札幌)', lat: 43.0621, lon: 141.3544 },
  { name: '青森', lat: 40.8244, lon: 140.7400 },
  { name: '岩手 (盛岡)', lat: 39.7020, lon: 141.1545 },
  { name: '宮城 (仙台)', lat: 38.2682, lon: 140.8694 },
  { name: '秋田', lat: 39.7186, lon: 140.1024 },
  { name: '山形', lat: 38.2554, lon: 140.3396 },
  { name: '福島', lat: 37.7608, lon: 140.4748 },
  { name: '茨城 (水戸)', lat: 36.3659, lon: 140.4715 },
  { name: '栃木 (宇都宮)', lat: 36.5551, lon: 139.8828 },
  { name: '群馬 (前橋)', lat: 36.3895, lon: 139.0634 },
  { name: '埼玉 (さいたま)', lat: 35.8617, lon: 139.6455 },
  { name: '千葉', lat: 35.6074, lon: 140.1065 },
  { name: '東京', lat: 35.6895, lon: 139.6917 },
  { name: '神奈川 (横浜)', lat: 35.4478, lon: 139.6425 },
  { name: '新潟', lat: 37.9026, lon: 139.0231 },
  { name: '富山', lat: 36.6953, lon: 137.2113 },
  { name: '石川 (金沢)', lat: 36.5613, lon: 136.6562 },
  { name: '福井', lat: 36.0641, lon: 136.2196 },
  { name: '山梨 (甲府)', lat: 35.6642, lon: 138.5683 },
  { name: '長野', lat: 36.6485, lon: 138.1942 },
  { name: '岐阜', lat: 35.4233, lon: 136.7607 },
  { name: '静岡', lat: 34.9756, lon: 138.3828 },
  { name: '愛知 (名古屋)', lat: 35.1815, lon: 136.9066 },
  { name: '三重 (津)', lat: 34.7186, lon: 136.5057 },
  { name: '滋賀 (大津)', lat: 35.0045, lon: 135.8686 },
  { name: '京都', lat: 35.0116, lon: 135.7681 },
  { name: '大阪', lat: 34.6937, lon: 135.5023 },
  { name: '兵庫 (神戸)', lat: 34.6901, lon: 135.1955 },
  { name: '奈良', lat: 34.6851, lon: 135.8048 },
  { name: '和歌山', lat: 34.2260, lon: 135.1675 },
  { name: '鳥取', lat: 35.5011, lon: 134.2351 },
  { name: '島根 (松江)', lat: 35.4681, lon: 133.0484 },
  { name: '岡山', lat: 34.6555, lon: 133.9198 },
  { name: '広島', lat: 34.3853, lon: 132.4553 },
  { name: '山口', lat: 34.1783, lon: 131.4737 },
  { name: '徳島', lat: 34.0703, lon: 134.5548 },
  { name: '香川 (高松)', lat: 34.3428, lon: 134.0466 },
  { name: '愛媛 (松山)', lat: 33.8392, lon: 132.7656 },
  { name: '高知', lat: 33.5588, lon: 133.5312 },
  { name: '福岡', lat: 33.6064, lon: 130.4124 },
  { name: '佐賀', lat: 33.2635, lon: 130.3009 },
  { name: '長崎', lat: 32.7503, lon: 129.8777 },
  { name: '熊本', lat: 32.7898, lon: 130.7416 },
  { name: '大分', lat: 33.2396, lon: 131.6093 },
  { name: '宮崎', lat: 31.9078, lon: 131.4202 },
  { name: '鹿児島', lat: 31.5966, lon: 130.5571 },
  { name: '沖縄 (那覇)', lat: 26.2124, lon: 127.6809 }
];