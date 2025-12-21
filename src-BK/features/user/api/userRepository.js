import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase"; // パスは配置に合わせて調整
import { cleanDataForLocal, sanitizeData } from "../../storage/sanitize";

const LOCAL_KEY = "shift_app_v1";

export const UserRepository = {
  // データの読み込み（クラウド優先 -> ローカルフォールバック）
  async load(user, canSaveCloud = false) {
    // ユーザーがいない、またはクラウド保存権限がない場合はローカルのみ
    if (!user || !canSaveCloud) {
      const local = localStorage.getItem(LOCAL_KEY);
      return local ? JSON.parse(local) : null;
    }

    try {
      const ref = doc(db, "users", user.uid, "private_data", "main");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        return snap.data();
      }
    } catch (e) {
      console.warn("[UserRepository.load] Cloud load failed, falling back to local:", e);
    }

    // クラウドになければ（またはエラーなら）ローカルを確認
    const local = localStorage.getItem(LOCAL_KEY);
    return local ? JSON.parse(local) : null;
  },

  // データの保存
  async save(user, fullData, canSaveCloud = false) {
    const safeData = sanitizeData(fullData);

    // 1. ローカル保存 (常に実行)
    const localData = cleanDataForLocal(safeData);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localData));

    // 2. クラウド保存 (権限がある場合のみ)
    if (!user || !canSaveCloud) return;

    try {
      const ref = doc(db, "users", user.uid, "private_data", "main");
      await setDoc(ref, safeData, { merge: true });
    } catch (error) {
      console.error("[UserRepository.save] Cloud save failed:", error);
    }
  },
};
