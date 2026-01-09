import * as admin from "firebase-admin";

// Inicializar Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;

export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Verificar se as credenciais estão disponíveis
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    console.warn(
      "⚠️  FIREBASE_SERVICE_ACCOUNT_JSON não configurado. Firebase não será inicializado."
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log("✅ Firebase inicializado com sucesso");
    return firebaseApp;
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
    return null;
  }
}

export function getFirebaseApp(): admin.app.App | null {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
}

export function getFirestore(): admin.firestore.Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return admin.firestore(app);
}

export function getFirebaseAuth(): admin.auth.Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return admin.auth(app);
}
