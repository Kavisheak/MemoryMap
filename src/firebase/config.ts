// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, inMemoryPersistence, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyDgeNQJ4P2gQSQx4_qdKuujPY8gZ4LcgA8",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "memorymap-47584.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "memorymap-47584",
  // Firebase Storage bucket is typically `<project-id>.appspot.com`
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "memorymap-47584.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "998529217502",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "1:998529217502:web:2ce514c141c38999b2234f",
  // measurementId: "G-D394NZ5G60" // ❌ don't use analytics in RN like this
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
try {
  // reuse if already initialized (HMR)
  auth = getAuth(app);
} catch {
  auth = initializeAuth(app, {
    // Firebase JS SDK v12+ doesn't expose a React Native AsyncStorage persistence helper.
    // In-memory persistence keeps auth working across app lifetime.
    persistence: inMemoryPersistence,
  });
}

export { app, auth };
export const db = getFirestore(app);
export const storage = getStorage(app);