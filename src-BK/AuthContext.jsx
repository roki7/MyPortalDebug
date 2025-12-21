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
  browserLocalPersistence,
  browserSessionPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// StrictMode の二重マウント対策（コンポーネント外）
let didBootstrap = false;
let redirectPromise = null;

const ensurePersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    // iOS/WebKit などで local が落ちることがあるので fallback
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch (e2) {
      console.warn("[auth] persistence unavailable:", e2?.code);
    }
  }
};

const getRedirectOnce = async () => {
  if (!redirectPromise) {
    redirectPromise = getRedirectResult(auth).catch((e) => {
      console.warn("[auth] getRedirectResult error:", e?.code);
      return null;
    });
  }
  return redirectPromise;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // invite は一度だけ読む（将来用）
  const inviteRef = useRef(null);
  const inviteAppliedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite) inviteRef.current = invite;
  }, []);

  const joinGroup = async (uid, groupId) => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, { members: arrayUnion(uid) });

    await updateDoc(doc(db, "users", uid), {
      groupId,
      role: "member",
    });

    // 自分の profile も即反映
    const authUid = auth.currentUser?.uid ?? currentUser?.uid;
    if (uid === authUid) {
      setUserProfile((prev) =>
        prev ? { ...prev, groupId, role: "member" } : prev
      );
    }
  };

  useEffect(() => {
    let unsub = null;

    const upsertAndSetProfile = async (user) => {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setUserProfile(snap.data());
        return snap.data();
      }

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
      return profile;
    };

    const handleAuth = async (user) => {
      setCurrentUser(user);

      if (user) {
        await upsertAndSetProfile(user);

        // invite があれば 1回だけ適用
        if (inviteRef.current && !inviteAppliedRef.current) {
          inviteAppliedRef.current = true;
          try {
            await joinGroup(user.uid, inviteRef.current);
          } finally {
            inviteRef.current = null;
            // invite パラメータ除去（必要なら）
            if (window.location.pathname.startsWith("/app")) {
              window.history.replaceState({}, document.title, "/app");
            }
          }
        }
      } else {
        setUserProfile(null);
        inviteAppliedRef.current = false;
      }

      setIsLoggingIn(false);
      setLoading(false);
    };

    const bootstrap = async () => {
      await ensurePersistence();

      // redirect 結果は StrictMode でも 1回だけ拾う
      if (!didBootstrap) {
        didBootstrap = true;
        const r = await getRedirectOnce();
        if (r?.user) {
          await handleAuth(r.user);
        }
      }

      unsub = onAuthStateChanged(auth, handleAuth);
    };

    bootstrap();

    return () => {
      if (unsub) unsub();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async () => {
    setIsLoggingIn(true);
    await ensurePersistence();
    await signInWithRedirect(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const createGroup = async () => {
    if (!currentUser) return null;

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

    return groupRef.id;
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

  // ===== 権限判定（MainApp が使ってるのを復活）=====
  const plan = userProfile?.plan ?? "free";
  const isGroupMember = !!userProfile?.groupId;

  const canSaveCloud =
    ["standard", "couple", "family"].includes(plan) || isGroupMember;

  const canShareGroup = ["couple", "family"].includes(plan) || isGroupMember;

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
      canSaveCloud,
      canShareGroup,
      isPremium: canSaveCloud,
    }),
    [
      currentUser,
      userProfile,
      loading,
      isLoggingIn,
      canSaveCloud,
      canShareGroup,
    ]
  );

  if (loading) return null; // ← 好きなローディングUIに変えてOK

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
