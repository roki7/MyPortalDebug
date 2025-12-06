// src/storage.js
import { doc, getDoc, setDoc, deleteDoc, writeBatch, collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { subYears, isBefore } from "date-fns";

const LOCAL_KEY = "shift_app_v1";

// --- ローカル保存用の軽量化 (直近2年分のみ) ---
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

// ======================================================================
//  データ保存 (個人・共有 分離の鉄則)
// ======================================================================
export const saveData = async (user, fullData, groupId = null) => {
  try {
    // 1. 【Browser】ローカルバックアップ (軽量化)
    const localData = cleanDataForLocal(fullData);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localData));

    if (!user) return;

    const batch = writeBatch(db);

    // 2. 【Personal DB】全データを保存 (users/{uid}/private_data/main)
    // ※ここは共有設定に関わらず、自分のデータ置き場として全て保存
    const userRef = doc(db, "users", user.uid, "private_data", "main");
    batch.set(userRef, fullData, { merge: true });

    // 3. 【Shared DB】共有ONのデータのみコピー (groups/{groupId}/shared_data/{uid})
    if (groupId) {
      const groupRef = doc(db, "groups", groupId, "shared_data", user.uid);
      
      // 共有用にデータを抽出 (isSharedフラグがあるもの、または共有設定されたリスト)
      // ※今回はシフトの `isShared` フラグ等はUI実装依存のため、例として全シフトを共有対象とするか、
      //   SettingsTab等で制御されたフラグを見ることになります。
      //   ここでは「共有モード」の挙動として、主要データを送ります。
      const sharedPayload = {
        uid: user.uid,
        userName: user.displayName || '名無し',
        updatedAt: new Date().toISOString(),
        // ★本来はここで filter(s => s.isShared) する
        shifts: fullData.shifts, 
        shopping: fullData.shopping, // 買い物リストは基本的に共有前提
        // 家計簿は共有しない、または共有設定されたもののみ
        payments: fullData.payments.filter(p => p.isShared), 
        
        // 画像用フィールド予約
        attachments: [] 
      };

      batch.set(groupRef, sharedPayload, { merge: true });
    }

    await batch.commit();
    console.log("✅ クラウド保存完了 (個人DB + 共有DB)");

  } catch (error) {
    console.error("保存エラー (ローカルに退避):", error);
    // 書き込み失敗時はローカルのみ更新されている状態(上記1で実施済)
  }
};

// ======================================================================
//  データ読み込み (移行・復旧・共有・キックチェック)
// ======================================================================
export const loadData = async (user) => {
  if (!user) {
    const local = localStorage.getItem(LOCAL_KEY);
    return { personal: local ? JSON.parse(local) : null, shared: [] };
  }

  try {
    // A. まず「個人データ」を取得
    const privateRef = doc(db, "users", user.uid, "private_data", "main");
    const privateSnap = await getDoc(privateRef);
    let personalData = null;

    if (privateSnap.exists()) {
      personalData = privateSnap.data();
      console.log("📂 個人データ読み込み成功");
    } else {
      // B. 【移行機能】古い場所を確認
      const oldRef = doc(db, "users", user.uid, "data", "main");
      const oldSnap = await getDoc(oldRef);
      if (oldSnap.exists()) {
        console.log("⚠️ データ移行を実行します...");
        personalData = oldSnap.data();
        await setDoc(privateRef, personalData); // 新しい場所にコピー
      } else {
        // C. 【自動復旧】サーバーになければローカルから復元
        const local = localStorage.getItem(LOCAL_KEY);
        if (local) {
          console.log("🆘 自動復旧を実行します...");
          personalData = JSON.parse(local);
          await setDoc(privateRef, personalData);
        }
      }
    }

    return { personal: personalData, shared: [] }; // 初期ロード時は共有データは空で返す(Subscriptionで取得するため)
  } catch (error) {
    console.error("読み込みエラー:", error);
    const local = localStorage.getItem(LOCAL_KEY);
    return { personal: local ? JSON.parse(local) : null, shared: [] };
  }
};

// ======================================================================
//  共有データのリアルタイム監視 (他人の更新を受け取る)
// ======================================================================
export const subscribeToSharedData = (groupId, onUpdate) => {
  if (!groupId) return () => {};
  
  const colRef = collection(db, "groups", groupId, "shared_data");
  return onSnapshot(colRef, (snapshot) => {
    const sharedDocs = [];
    snapshot.forEach(doc => {
      // 自分以外のデータ、または自分の共有データのコピーも含めて取得
      // ここでは「表示用」として全員分をまとめる
      sharedDocs.push({ ...doc.data(), uid: doc.id });
    });
    console.log("📡 共有データ更新受信:", sharedDocs.length);
    onUpdate(sharedDocs);
  });
};

// ======================================================================
//  キック時の救済データ取得
// ======================================================================
export const fetchKickedData = async (user, oldGroupId) => {
  // 共有DBに残っている自分のデータを取得する
  const mySharedRef = doc(db, "groups", oldGroupId, "shared_data", user.uid);
  const snap = await getDoc(mySharedRef);
  if (snap.exists()) {
    returnZnap.data();
  }
  return null;
};