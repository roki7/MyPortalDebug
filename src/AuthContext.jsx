// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // ログインユーザー
  const [userProfile, setUserProfile] = useState(null); // DB上のプロフィール（プラン等）
  const [loading, setLoading] = useState(true);

  // ログイン処理
  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // 初回ログインならDBにユーザー枠を作る
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          name: result.user.displayName,
          email: result.user.email,
          plan: 'free', // デフォルトは無料
          groupId: null, // まだ家族なし
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  // ログアウト
  const logout = () => signOut(auth);

  // 監視（ログイン状態が変わったら動く）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // プロフィール取得
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    login,
    logout,
    isPremium: userProfile?.plan === 'couple' || userProfile?.plan === 'family'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};