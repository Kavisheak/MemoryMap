// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyDgeNQJ4P2gQSQx4_qdKuujPY8gZ4LcgA8",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "memorymap-47584.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "memorymap-47584",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "memorymap-47584.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "998529217502",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "1:998529217502:web:2ce514c141c38999b2234f",
  // measurementId: "G-D394NZ5G60" // ❌ don't use analytics in RN like this
};

// Initialize Firebase
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);


// ✅ Auth with persistence in React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});