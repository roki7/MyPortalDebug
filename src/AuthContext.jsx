// src/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
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

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 招待コード（将来用）
  const inviteCodeRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite) inviteCodeRef.current = invite;
  }, []);

  // ログイン（Popup優先→ダメならRedirect）
  const login = async () => {
    await signInWithRedirect(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  /* ============
     GROUP
  ============ */
  const createGroup = async () => {
    if (!currentUser) return null;

    const groupRef = await addDoc(collection(db, "groups"), {
      ownerId: currentUser.uid,
      members: [currentUser.uid],
      createdAt: serverTimestamp(),
    });
    await getRedirectResult(auth);
    await updateDoc(doc(db, "users", currentUser.uid), {
      groupId: groupRef.id,
      role: "owner",
    });

    setUserProfile((prev) =>
      prev ? { ...prev, groupId: groupRef.id, role: "owner" } : prev
    );
    return groupRef.id;
  };

  const joinGroup = async (uid, groupId) => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, { members: arrayUnion(uid) });
    await updateDoc(doc(db, "users", uid), { groupId, role: "member" });

    setUserProfile((prev) =>
      prev ? { ...prev, groupId, role: "member" } : prev
    );
  };

  const leaveGroup = async () => {
    if (!currentUser || !userProfile?.groupId) return;

    const groupId = userProfile.groupId;
    const groupRef = doc(db, "groups", groupId);

    await updateDoc(groupRef, { members: arrayRemove(currentUser.uid) });
    await updateDoc(doc(db, "users", currentUser.uid), {
      groupId: null,
      role: null,
    });

    setUserProfile((prev) =>
      prev ? { ...prev, groupId: null, role: null } : prev
    );
  };

  /* ============
     AUTH INIT
  ============ */
  useEffect(() => {
    // 🔴 redirectログイン後の復帰を確実にする
    (async () => {
      try {
        console.log("[auth] getRedirectResult start");
        const r = await getRedirectResult(auth);
        console.log("[auth] getRedirectResult result", r?.user?.uid ?? null);
      } catch (e) {
        console.warn("[auth] getRedirectResult error", e?.code, e);
      }
    })();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          const profile = {
            uid: user.uid,
            name: user.displayName ?? "",
            email: user.email ?? "",
            plan: "free",
            groupId: null,
            role: null,
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, profile);
          setUserProfile(profile);
        } else {
          setUserProfile(snap.data());
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
      isLoggingIn,
      login,
      logout,
      createGroup,
      joinGroup,
      leaveGroup,
      isOwner: userProfile?.role === "owner",
    }),
    [currentUser, userProfile, loading, isLoggingIn]
  );

  // まずは白画面じゃなく「何も出さない」(後でローディングUI付ければOK)
  if (loading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
