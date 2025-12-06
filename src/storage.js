// src/storage.js
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { subYears, isBefore, parseISO } from "date-fns"; // 日付操作ライブラリを追加

const LOCAL_KEY = "shift_app_v1";

// ----------------------------------------------------------------------
// ヘルパー: ローカル保存用にデータを軽量化する（直近2年分のみ残す）
// ----------------------------------------------------------------------
const cleanDataForLocal = (data) => {
  if (!data) return data;
  
  // 基準日：今日から2年前
  const twoYearsAgo = subYears(new Date(), 2);
  const clean = { ...data };

  // 1. シフト (Object: "yyyy-MM-dd": [...])
  if (clean.shifts) {
    const newShifts = {};
    Object.keys(clean.shifts).forEach(dateStr => {
       // 日付キーが2年以内なら保持
       // ※日付として解釈できないキーは念のため残す
       const d = new Date(dateStr);
       if (isNaN(d.getTime()) || !isBefore(d, twoYearsAgo)) {
         newShifts[dateStr] = clean.shifts[dateStr];
       }
    });
    clean.shifts = newShifts;
  }

  // 2. 家計簿履歴 (Array)
  if (clean.payments) {
    clean.payments = clean.payments.filter(p => {
      if (!p.date) return true; // 日付なしは残す
      return !isBefore(new Date(p.date), twoYearsAgo);
    });
  }

  // 3. 買い物履歴 (Array)
  if (clean.shopping && clean.shopping.history) {
    clean.shopping = {
      ...clean.shopping,
      history: clean.shopping.history.filter(h => {
         if (!h.date) return true;
         return !isBefore(new Date(h.date), twoYearsAgo);
      })
    };
  }

  return clean;
};

// ----------------------------------------------------------------------
// 1. 保存ロジック（軽量化 & 個人・共有分離）
// ----------------------------------------------------------------------
export const saveData = async (user, data, groupId = null) => {
  try {
    // 【Browser】
    // ローカルには「直近2年分」に軽量化したデータを保存
    // これで10年使っても容量エラーにならず、動作も軽快なまま維持できる
    const localData = cleanDataForLocal(data);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localData));

    if (!user) return;

    // 【Cloud】
    // クラウドには「全データ」をそのまま保存（無期限）
    // 個人データの保存先: users/{uid}/private_data
    const userRef = doc(db, "users", user.uid, "private_data", "main");
    
    // バッチ処理で一括書き込み
    const batch = writeBatch(db);
    batch.set(userRef, data, { merge: true });
    
    await batch.commit();
    console.log("クラウドに保存しました (分離対応・全データ)");

  } catch (error) {
    console.error("保存エラー:", error);
  }
};

// ----------------------------------------------------------------------
// 2. 読み込みロジック（移行・復旧機能付き）
// ----------------------------------------------------------------------
export const loadData = async (user) => {
  if (!user) {
    const local = localStorage.getItem(LOCAL_KEY);
    return local ? JSON.parse(local) : null;
  }

  try {
    // A. まず「新しい保存場所」を確認
    const newRef = doc(db, "users", user.uid, "private_data", "main");
    const newSnap = await getDoc(newRef);

    if (newSnap.exists()) {
      console.log("✅ 新しい形式のデータを読み込みました");
      return newSnap.data();
    }

    // --- データ移行 & 自動復旧プロセス ---

    // B. 【移行機能】「古い保存場所」を確認する
    const oldRef = doc(db, "users", user.uid, "data", "main");
    const oldSnap = await getDoc(oldRef);

    if (oldSnap.exists()) {
      console.log("⚠️ 古いデータ形式を検出。新しい形式へ移行します...");
      const oldData = oldSnap.data();
      
      // 新しい場所へコピー
      await setDoc(newRef, oldData);
      console.log("✨ データ移行完了！");
      return oldData;
    }

    // C. 【安全機構】サーバー消失時の自動復旧
    const localDataJSON = localStorage.getItem(LOCAL_KEY);
    if (localDataJSON) {
      console.log("🆘 サーバーデータなし。端末バックアップから自動復旧を試みます...");
      const localData = JSON.parse(localDataJSON);
      
      if (localData && (localData.jobs?.length > 0 || localData.accounts?.length > 0)) {
        await setDoc(newRef, localData);
        console.log("gg 自動復旧に成功しました！");
        return localData;
      }
    }

    // D. 完全新規
    console.log("データなし（新規ユーザー）");
    return null;

  } catch (error) {
    console.error("読み込みエラー:", error);
    const local = localStorage.getItem(LOCAL_KEY);
    return local ? JSON.parse(local) : null;
  }
};