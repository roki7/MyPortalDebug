// src/storage.js
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

const LOCAL_KEY = "shift_app_v1";

// ----------------------------------------------------------------------
// 1. 保存ロジック（個人と共有を分離して保存）
// ----------------------------------------------------------------------
export const saveData = async (user, data, groupId = null) => {
  try {
    // 【Browser】常にローカルにはバックアップとして全データを保存 (オフライン・復旧用)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));

    if (!user) return;

    // 【Cloud】個人データと共有データを分離して保存
    // ※現在はまだロジック上「data」にすべて入っているため、
    //   一旦すべてを「個人データ」として保存し、共有機能実装時に振り分け処理を追加します。
    
    // 個人データの保存先: users/{uid}/private_data
    const userRef = doc(db, "users", user.uid, "private_data", "main");
    
    // 共有データの保存先（将来用）: groups/{groupId}/shared_data
    // const groupRef = groupId ? doc(db, "groups", groupId, "shared_data", "main") : null;

    // バッチ処理で一括書き込み（将来的に共有データも同時に書き込むため）
    const batch = writeBatch(db);
    batch.set(userRef, data, { merge: true });
    
    await batch.commit();
    console.log("クラウドに保存しました (分離対応版)");

  } catch (error) {
    console.error("保存エラー:", error);
  }
};

// ----------------------------------------------------------------------
// 2. 読み込みロジック（移行・復旧機能付き）
// ----------------------------------------------------------------------
export const loadData = async (user) => {
  if (!user) {
    // ログインしていない場合はローカルから読むだけ
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

    // --- ここから下は「データが見つからない」場合の特殊処理 ---

    // B. 【移行機能】「古い保存場所」を確認する
    const oldRef = doc(db, "users", user.uid, "data", "main");
    const oldSnap = await getDoc(oldRef);

    if (oldSnap.exists()) {
      console.log("⚠️ 古いデータ形式を検出。新しい形式へ移行します...");
      const oldData = oldSnap.data();
      
      // 新しい場所へコピー
      await setDoc(newRef, oldData);
      
      // (オプション) 心配なら古いデータは消さずに残す、あるいは移行完了フラグを立てる
      // await deleteDoc(oldRef); // 完全に移行したら消すコードを有効化

      console.log("✨ データ移行完了！");
      return oldData;
    }

    // C. 【安全機構】DBにはないが、ブラウザ(ローカル)にはある場合 -> 自動復旧
    // ※「サーバー障害」や「誤ってDBを消した」時の保険
    const localDataJSON = localStorage.getItem(LOCAL_KEY);
    if (localDataJSON) {
      console.log("🆘 サーバーにデータがありませんが、端末にバックアップがありました。自動復旧を試みます...");
      const localData = JSON.parse(localDataJSON);
      
      // 念のため、空っぽのデータでないか簡易チェック（例: jobsがあるか）
      if (localData && (localData.jobs?.length > 0 || localData.accounts?.length > 0)) {
        await setDoc(newRef, localData);
        console.log("gg 自動復旧に成功しました！");
        return localData;
      }
    }

    // D. どこにもない = 本当の新規ユーザー
    console.log("データなし（新規ユーザー）");
    return null;

  } catch (error) {
    console.error("読み込みエラー:", error);
    // エラー時は最悪ローカルを表示して凌ぐ
    const local = localStorage.getItem(LOCAL_KEY);
    return local ? JSON.parse(local) : null;
  }
};