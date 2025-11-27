// src/storage.js
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// ローカル保存用のキー名
const LOCAL_KEY = "shift_app_v1";

// ★データを保存する関数 (exportが必要です！)
export const saveData = async (user, data) => {
  try {
    // 1. 常にローカルにはバックアップとして保存 (オフライン対応)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));

    // 2. ログインしていればクラウドにも保存
    if (user) {
      const userRef = doc(db, "users", user.uid, "data", "main");
      await setDoc(userRef, data, { merge: true });
      console.log("クラウドに保存しました");
    }
  } catch (error) {
    console.error("保存エラー:", error);
  }
};

// ★データを読み込む関数 (exportが必要です！)
export const loadData = async (user) => {
  try {
    let cloudData = null;

    // 1. ログインしていればクラウドから取得
    if (user) {
      const userRef = doc(db, "users", user.uid, "data", "main");
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        cloudData = snap.data();
        console.log("クラウドから読み込みました");
      }
    }

    // 2. クラウドになければローカルから取得
    if (!cloudData) {
      const local = localStorage.getItem(LOCAL_KEY);
      if (local) {
        console.log("ローカルから読み込みました");
        return JSON.parse(local);
      }
    }

    return cloudData;
  } catch (error) {
    console.error("読み込みエラー:", error);
    return null;
  }
};