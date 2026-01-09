import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase/config";

export async function signUpEmail(email: string, password: string, fullName?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (fullName?.trim()) {
    await updateProfile(cred.user, { displayName: fullName.trim() });
  }
  return cred;
}

export function signInEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function signInWithGoogleIdToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export function signOutUser() {
  return signOut(auth);
}