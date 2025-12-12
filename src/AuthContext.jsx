// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite) setInviteCode(invite);
  }, []);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          name: result.user.displayName,
          email: result.user.email,
          plan: "free",
          groupId: null,
          createdAt: new Date(),
        });
      }
      if (inviteCode) {
        await joinGroup(result.user.uid, inviteCode);
        setInviteCode(null);
        window.history.replaceState({}, document.title, "/app");
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => signOut(auth);

  const createGroup = async () => {
    if (!currentUser) return;
    const groupRef = await addDoc(collection(db, "groups"), {
      ownerId: currentUser.uid,
      members: [currentUser.uid],
      createdAt: new Date(),
    });
    const groupId = groupRef.id;
    await updateDoc(doc(db, "users", currentUser.uid), {
      groupId: groupId,
      role: "owner",
    });
    setUserProfile((prev) => ({ ...prev, groupId, role: "owner" }));
    return groupId;
  };

  const joinGroup = async (uid, groupId) => {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);
    if (groupSnap.exists()) {
      await updateDoc(groupRef, { members: arrayUnion(uid) });
      await updateDoc(doc(db, "users", uid), {
        groupId: groupId,
        role: "member",
      });
      alert("グループに参加しました！");
      // ステートも即座に更新
      setUserProfile((prev) => ({ ...prev, groupId, role: "member" }));
    } else {
      alert("無効な招待リンクです。");
    }
  };

  const kickMember = async (targetUid) => {
    if (!userProfile?.groupId || userProfile.role !== "owner") return;
    if (!window.confirm("削除しますか？")) return;

    const groupRef = doc(db, "groups", userProfile.groupId);

    await updateDoc(groupRef, { members: arrayRemove(targetUid) });
    await updateDoc(doc(db, "users", targetUid), {
      groupId: null,
      kickedFrom: userProfile.groupId,
      kickedAt: new Date(),
    });
    await deleteDoc(
      doc(db, "groups", userProfile.groupId, "shared_data", targetUid)
    );

    alert("削除しました");
  };

  const leaveGroup = async () => {
    if (!userProfile?.groupId) return;
    if (window.confirm("退会しますか？")) {
      const groupRef = doc(db, "groups", userProfile.groupId);

      await updateDoc(groupRef, { members: arrayRemove(currentUser.uid) });
      await updateDoc(doc(db, "users", currentUser.uid), {
        groupId: null,
        role: null,
      });
      await deleteDoc(
        doc(db, "groups", userProfile.groupId, "shared_data", currentUser.uid)
      );

      setUserProfile((prev) => ({ ...prev, groupId: null, role: null }));
      window.location.reload();
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserProfile(docSnap.data());
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ★修正: 権限ロジック
  const plan = userProfile?.plan || "free";
  const isGroupMember = !!userProfile?.groupId; // グループに参加しているかどうか

  // クラウド保存: 有料プラン契約者 OR グループ参加者
  const canSaveCloud =
    ["standard", "couple", "family"].includes(plan) || isGroupMember;

  // 共有機能: カップル・ファミリー契約者 OR グループ参加者
  const canShareGroup = ["couple", "family"].includes(plan) || isGroupMember;

  const value = {
    currentUser,
    userProfile,
    login,
    logout,
    createGroup,
    joinGroup,
    kickMember,
    leaveGroup,
    isOwner: userProfile?.role === "owner",
    canSaveCloud,
    canShareGroup,
    isPremium: canSaveCloud,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
