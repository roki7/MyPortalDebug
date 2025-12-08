// src/storage.js
import { doc, getDoc, setDoc, writeBatch, collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { subYears, isBefore } from "date-fns";

const LOCAL_KEY = "shift_app_v1";

// undefined対策
const sanitizeData = (data) => {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => sanitizeData(item));
  const cleaned = {};
  Object.keys(data).forEach(key => {
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
    Object.keys(clean.shifts).forEach(dateStr => {
       const d = new Date(dateStr);
       if (isNaN(d.getTime()) || !isBefore(d, twoYearsAgo)) {
         newShifts[dateStr] = clean.shifts[dateStr];
       }
    });
    clean.shifts = newShifts;
  }
  return clean;
};

// 保存処理
export const saveData = async (user, fullData, groupId = null) => {
  try {
    const safeData = sanitizeData(fullData);
    const localData = cleanDataForLocal(safeData);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localData));

    if (!user) return;

    const batch = writeBatch(db);
    const userRef = doc(db, "users", user.uid, "private_data", "main");
    batch.set(userRef, safeData, { merge: true });

    if (groupId) {
      const groupRef = doc(db, "groups", groupId, "shared_data", user.uid);
      const sharedPayload = {
        uid: user.uid,
        userName: user.displayName || '名無し',
        updatedAt: new Date().toISOString(),
        shifts: safeData.shifts || {},
        shopping: safeData.shopping || {},
        payments: (safeData.payments || []).filter(p => p.isShared),
        attachments: [] 
      };
      batch.set(groupRef, sanitizeData(sharedPayload), { merge: true });
    }
    await batch.commit();
    console.log("✅ クラウド保存完了");
  } catch (error) {
    console.error("保存エラー:", error);
  }
};

// 読み込み・移行処理
export const loadData = async (user) => {
  if (!user) {
    const local = localStorage.getItem(LOCAL_KEY);
    return { personal: local ? JSON.parse(local) : null, shared: [] };
  }
  try {
    const privateRef = doc(db, "users", user.uid, "private_data", "main");
    const snap = await getDoc(privateRef);
    let personalData = null;

    if (snap.exists()) {
      personalData = snap.data();
    } else {
      // 移行ロジック
      const oldRef = doc(db, "users", user.uid, "data", "main");
      const oldSnap = await getDoc(oldRef);
      if (oldSnap.exists()) {
        console.log("⚠️ データ移行を実行");
        personalData = oldSnap.data();
        await setDoc(privateRef, sanitizeData(personalData));
      } else {
        const local = localStorage.getItem(LOCAL_KEY);
        if (local) {
          personalData = JSON.parse(local);
          await setDoc(privateRef, sanitizeData(personalData));
        }
      }
    }
    return { personal: personalData, shared: [] };
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
    snapshot.forEach(doc => sharedDocs.push({ ...doc.data(), uid: doc.id }));
    onUpdate(sharedDocs);
  });
};