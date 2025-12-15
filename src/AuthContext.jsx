// src/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

// 🔴 重要：firebase/auth は * as でまとめて import
import * as authSdk from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db, googleProvider } from "./firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 招待コード保持（将来用）
  const inviteCodeRef = useRef(null);

  // invite code を一度だけ取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite) inviteCodeRef.current = invite;
  }, []);

  /* =====================
     LOGIN / LOGOUT
  ===================== */

  const login = async () => {
    try {
      await authSdk.signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.warn("Popup failed, fallback to redirect:", error.code);

      // popup不可環境（Safari / iOS / PWAなど）
      if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/popup-closed-by-user"
      ) {
        await authSdk.signInWithRedirect(auth, googleProvider);
      } else {
        throw error;
      }
    }
  };

  const logout = async () => {
    await authSdk.signOut(auth);
  };

  /* =====================
     GROUP
  ===================== */

  const createGroup = async () => {
    if (!currentUser) return;

    const groupRef = await addDoc(collection(db, "groups"), {
      ownerId: currentUser.uid,
      members: [currentUser.uid],
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "users", currentUser.uid), {
      groupId: groupRef.id,
      role: "owner",
    });

    setUserProfile((prev) =>
      prev ? { ...prev, groupId: groupRef.id, role: "owner" } : prev
    );
  };

  const joinGroup = async (uid, groupId) => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(uid),
    });

    await updateDoc(doc(db, "users", uid), {
      groupId,
      role: "member",
    });
  };

  const leaveGroup = async () => {
    if (!currentUser || !userProfile?.groupId) return;

    const groupRef = doc(db, "groups", userProfile.groupId);

    await updateDoc(groupRef, {
      members: arrayRemove(currentUser.uid),
    });

    await updateDoc(doc(db, "users", currentUser.uid), {
      groupId: null,
      role: null,
    });

    setUserProfile((prev) =>
      prev ? { ...prev, groupId: null, role: null } : prev
    );
  };

  /* =====================
     AUTH INIT（最重要）
  ===================== */

  useEffect(() => {
    const unsubscribe = authSdk.onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);

        // 初回ログイン時
        if (!snap.exists()) {
          const profile = {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            plan: "free",
            groupId: null,
            role: null,
            createdAt: serverTimestamp(),
          };
          await setDoc(docRef, profile);
          setUserProfile(profile);
        } else {
          setUserProfile(snap.data());
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* =====================
     RENDER
  ===================== */

  if (loading) return null; // ← LoadingコンポーネントにしてもOK

  const value = {
    currentUser,
    userProfile,
    login,
    logout,
    createGroup,
    joinGroup,
    leaveGroup,
    isOwner: userProfile?.role === "owner",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
