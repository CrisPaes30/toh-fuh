import { useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import {
  onAuthStateChange,
  logout as firebaseLogout,
  getIdToken,
  getLoginRedirectResult,
  authPersistenceReady,
} from "@/lib/firebase";

interface UseFirebaseAuthReturn {
  user: FirebaseUser | null;
  loading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};

    (async () => {
      // garante que a persistência foi aplicada
      await authPersistenceReady;

      // tenta finalizar redirect (se existir)
      await getLoginRedirectResult().catch(() => null);

      // listener oficial
      unsubscribe = onAuthStateChange((authUser) => {
        console.log("[Auth] onAuthStateChanged:", authUser?.email ?? null);
        setUser(authUser);
        setLoading(false);
      });
    })();

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      setError(null);
      await firebaseLogout();
      setUser(null);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Erro ao fazer logout");
      setError(e);
      throw e;
    }
  };

  const getToken = async (): Promise<string | null> => {
    try {
      return await getIdToken();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao obter token"));
      return null;
    }
  };

  return { user, loading, error, logout, getToken };
}
