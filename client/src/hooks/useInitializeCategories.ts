import { useEffect, useRef } from "react";
import { useFirebaseAuth } from "./useFirebaseAuth";
import { initializeDefaultCategories } from "@/lib/db";

export function useInitializeCategories() {
  const { user } = useFirebaseAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (user && !hasInitialized.current) {
      hasInitialized.current = true;
      initializeDefaultCategories().catch(console.error);
    }
  }, [user]);
}
