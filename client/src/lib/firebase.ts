import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Erro ao configurar persistência do Firebase Auth:", error);
});

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");
// googleProvider.setCustomParameters({ prompt: "select_account" });

/** ✅ Login com Popup (recomendado no localhost) */
export async function loginWithGooglePopup(): Promise<FirebaseUser> {
  await authPersistenceReady;
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/** Login com Redirect (melhor para mobile/produção, mas pode falhar no localhost) */
export async function loginWithGoogleRedirect(): Promise<void> {
  await authPersistenceReady;
  await signInWithRedirect(auth, googleProvider);
}

/** Resultado do redirect (quando usar redirect) */
export async function getLoginRedirectResult() {
  await authPersistenceReady;
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error("Erro ao obter resultado do redirect:", error);
    return null;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

export function onAuthStateChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) return null;
  return await user.getIdToken();
}
