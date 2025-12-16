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

let hasBootstrapRun = false;
let redirectResultPromise = null;

const ensurePersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch (fallbackError) {
      console.warn("[auth] persistence unavailable", fallbackError?.code);
    }
  }
};

const getRedirectResultOnce = async () => {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth).catch((error) => {
      console.warn("[auth] getRedirectResult error", error?.code);
      return null;
    });
  }
  return redirectResultPromise;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const pendingInviteRef = useRef(null);
  const inviteAppliedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");

    console.log("[auth] host", window.location.host);
    console.log("[auth] app name", auth.app.name);
    console.log("[auth] apiKey", auth.app.options.apiKey);
    console.log("[auth] authDomain", auth.app.options.authDomain);
    console.log("[auth] projectId", auth.app.options.projectId);

    if (invite) {
      pendingInviteRef.current = invite;
    }
  }, []);

  useEffect(() => {
    let unsubscribe = null;

    const handleAuthChange = async (user) => {
      setCurrentUser(user);

      if (user) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          setUserProfile(snap.data());
        } else {
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
        }

        if (pendingInviteRef.current && !inviteAppliedRef.current) {
          inviteAppliedRef.current = true;
          try {
            await joinGroup(user.uid, pendingInviteRef.current);
          } finally {
            pendingInviteRef.current = null;
            window.history.replaceState({}, document.title, "/app");
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
      if (!hasBootstrapRun) {
        hasBootstrapRun = true;
        await ensurePersistence();
        const result = await getRedirectResultOnce();
        if (result?.user) {
          await handleAuthChange(result.user);
        }
      }

      unsubscribe = onAuthStateChanged(auth, handleAuthChange);
    };

    bootstrap();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const login = async () => {
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

  const joinGroup = async (uid, groupId) => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, { members: arrayUnion(uid) });
    await updateDoc(doc(db, "users", uid), { groupId, role: "member" });
    if (uid === currentUser?.uid) {
      setUserProfile((prev) =>
        prev ? { ...prev, groupId, role: "member" } : prev
      );
    }
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

  if (loading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
