import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore as _getFirestore } from "firebase-admin/firestore";
import { getAuth as _getAuth } from "firebase-admin/auth";

let firebaseApp: App | null = null;

export function initializeFirebase(): App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    console.error(
      "❌ FIREBASE_SERVICE_ACCOUNT_JSON não configurado.\n" +
      "   → Firebase Console → Configurações do Projeto → Contas de Serviço → Gerar nova chave privada\n" +
      "   → Copie o conteúdo do JSON para .env.local como FIREBASE_SERVICE_ACCOUNT_JSON='...'"
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log("✅ Firebase inicializado com sucesso");
    return firebaseApp;
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
    return null;
  }
}

export function getFirebaseApp(): App | null {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
}

export function getFirestore() {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return _getFirestore(app);
  } catch {
    return null;
  }
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return _getAuth(app);
  } catch {
    return null;
  }
}
