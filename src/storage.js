// src/storage.js
import { UserRepository } from "./features/user/api/userRepository";
import { GroupRepository } from "./features/groups/api/groupRepository";

// 既存のインターフェースを維持
export const saveData = async (
  user,
  fullData,
  groupId = null,
  canSaveCloud = false
) => {
  // 1. 個人データの保存 (Local + Cloud)
  await UserRepository.save(user, fullData, canSaveCloud);

  // 2. グループ共有データの保存
  if (groupId && user && canSaveCloud) {
    const privacy = fullData.settings?.privacy;
    await GroupRepository.saveShared(groupId, user, fullData, privacy);
  }
};

export const loadData = async (user, canSaveCloud = false) => {
  const personal = await UserRepository.load(user, canSaveCloud);
  return { personal, shared: [] }; // sharedはsubscribeで取るので初期値は空
};

export const subscribeToSharedData = (groupId, onUpdate) => {
  return GroupRepository.subscribeSharedData(groupId, onUpdate);
};
