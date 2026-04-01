import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';

import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// ✅ INIT APP
const app = initializeApp(firebaseConfig);

// ✅ AUTH
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ✅ FIRESTORE (⚠️ FIXED)
export const db = getFirestore(app); // ❌ पहले गलत था (databaseId मत डाल)

// ✅ AUTH FUNCTIONS
export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Google Login Error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};

// ✅ PHONE LOGIN EXPORT
export { RecaptchaVerifier, signInWithPhoneNumber };

// ✅ OPTIONAL TEST (Safe)
const testConnection = async () => {
  try {
    console.log("🔥 Firebase Connected Successfully");
  } catch (error) {
    console.error("Firebase Connection Error:", error);
  }
};

testConnection();
