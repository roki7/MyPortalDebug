// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCm7u0FePbj35U-tdUQErteAIBqbQTCTKE",
  authDomain: "myportal-7b33f.firebaseapp.com",
  projectId: "myportal-7b33f",
  storageBucket: "myportal-7b33f.firebasestorage.app",
  messagingSenderId: "830826294878",
  appId: "1:830826294878:web:91a7c8d28bd10e9d888ecf",
  measurementId: "G-W4H1Y6LZ0P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();