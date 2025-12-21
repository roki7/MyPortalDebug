import { doc, writeBatch, collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import { sanitizeData } from "../../storage/sanitize";

export const GroupRepository = {
  // 共有データの保存 (Batch処理)
  async saveShared(groupId, user, safeData, privacy) {
    if (!groupId || !user) return;

    try {
      const batch = writeBatch(db);
      const groupRef = doc(db, "groups", groupId, "shared_data", user.uid);

      // プライバシー設定に基づいて送信データをフィルタリング
      const sharedPayload = {
        uid: user.uid,
        userName: user.displayName ?? "名無し",
        updatedAt: new Date().toISOString(),
        shifts: privacy?.shifts ? safeData.shifts || {} : {},
        shopping: privacy?.shopping ? safeData.shopping || {} : {},
        payments: privacy?.finance
          ? (safeData.payments || []).filter((p) => p.isShared)
          : [],
        jobs: privacy?.shifts ? safeData.jobs || [] : [],
        attachments: [],
      };

      batch.set(groupRef, sanitizeData(sharedPayload), { merge: true });
      await batch.commit();
    } catch (error) {
      console.error("[GroupRepository.saveShared] Failed:", error);
    }
  },

  // 共有データの購読
  subscribeSharedData(groupId, onUpdate) {
    if (!groupId) return () => {};

    const colRef = collection(db, "groups", groupId, "shared_data");
    // 返り値は unsubscribe 関数
    return onSnapshot(colRef, (snapshot) => {
      const sharedDocs = snapshot.docs.map((d) => ({ ...d.data(), uid: d.id }));
      onUpdate(sharedDocs);
    }, (error) => {
      console.error("[GroupRepository.subscribe] Error:", error);
    });
  },
};
