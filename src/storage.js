// src/storage.js
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { subYears, isBefore } from "date-fns";

const LOCAL_KEY = "shift_app_v1";

// undefined対策
const sanitizeData = (data) => {
  if (data === undefined) return null;
  if (data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map((item) => sanitizeData(item));
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    const val = sanitizeData(data[key]);
    cleaned[key] = val === undefined ? null : val;
  });
  return cleaned;
};

// ローカル軽量化
const cleanDataForLocal = (data) => {
  if (!data) return data;
  const twoYearsAgo = subYears(new Date(), 2);
  const clean = { ...data };
  if (clean.shifts) {
    const newShifts = {};
    Object.keys(clean.shifts).forEach((dateStr) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime()) || !isBefore(d, twoYearsAgo)) {
        newShifts[dateStr] = clean.shifts[dateStr];
      }
    });
    clean.shifts = newShifts;
  }
  return clean;
};

// 引数に canSaveCloud を追加
export const saveData = async (
  user,
  fullData,
  groupId = null,
  canSaveCloud = false
) => {
  try {
    const safeData = sanitizeData(fullData);
    const localData = cleanDataForLocal(safeData);
    // ローカル保存は常に実行
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localData));

    // ユーザーがいない、またはクラウド保存権限がない場合はここで終了
    if (!user || !canSaveCloud) return;

    const batch = writeBatch(db);
    const userRef = doc(db, "users", user.uid, "private_data", "main");
    batch.set(userRef, safeData, { merge: true });

    // グループ共有書き込み
    if (groupId) {
      // ★修正: プライバシー設定を取得（なければデフォルトOFF）
      const privacy = safeData.settings?.privacy || {
        shifts: false,
        finance: false,
        shopping: false,
      };

      const groupRef = doc(db, "groups", groupId, "shared_data", user.uid);
      const sharedPayload = {
        uid: user.uid,
        userName: user.displayName || "名無し",
        updatedAt: new Date().toISOString(),
        // ★修正: プライバシー設定に基づいてデータをフィルタリング
        shifts: privacy.shifts ? safeData.shifts || {} : {},
        shopping: privacy.shopping ? safeData.shopping || {} : {},
        payments: privacy.finance
          ? (safeData.payments || []).filter((p) => p.isShared)
          : [],

        // jobsはshiftsの表示に必須のため、シフト共有ONなら送る（または最低限の情報のみ送る実装も可だが今回はそのまま）
        // ただしジョブ定義自体に個人情報は少ないと想定
        jobs: privacy.shifts ? safeData.jobs || [] : [],

        attachments: [],
      };
      batch.set(groupRef, sanitizeData(sharedPayload), { merge: true });
    }
    await batch.commit();
    console.log("✅ クラウド保存完了");
  } catch (error) {
    console.error("保存エラー:", error);
  }
};

// 引数に canSaveCloud を追加
export const loadData = async (user, canSaveCloud = false) => {
  // ユーザーがいない、またはクラウド権限がない場合はローカルのみ読み込む
  if (!user || !canSaveCloud) {
    const local = localStorage.getItem(LOCAL_KEY);
    return { personal: local ? JSON.parse(local) : null, shared: [] };
  }

  try {
    const privateRef = doc(db, "users", user.uid, "private_data", "main");
    const snap = await getDoc(privateRef);

    // ▼ 修正箇所: シンプルに「あれば返す、なければローカル」だけにします
    if (snap.exists()) {
      return { personal: snap.data(), shared: [] };
    } else {
      // クラウドになければローカルを確認
      const local = localStorage.getItem(LOCAL_KEY);
      return { personal: local ? JSON.parse(local) : null, shared: [] };
    }
    // ▲ 修正ここまで
  } catch (error) {
    console.error("読み込みエラー:", error);
    const local = localStorage.getItem(LOCAL_KEY);
    return { personal: local ? JSON.parse(local) : null, shared: [] };
  }
};

export const subscribeToSharedData = (groupId, onUpdate) => {
  if (!groupId) return () => {};
  const colRef = collection(db, "groups", groupId, "shared_data");
  return onSnapshot(colRef, (snapshot) => {
    const sharedDocs = [];
    snapshot.forEach((doc) => sharedDocs.push({ ...doc.data(), uid: doc.id }));
    onUpdate(sharedDocs);
  });
};
