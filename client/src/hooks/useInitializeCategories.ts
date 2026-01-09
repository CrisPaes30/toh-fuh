import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Hook to initialize default categories for a new user
 * Runs once when user is authenticated
 */
export function useInitializeCategories() {
  const { isAuthenticated } = useAuth();
  const hasInitialized = useRef(false);
  const initMutation = trpc.setup.initCategories.useMutation();

  useEffect(() => {
    if (isAuthenticated && !hasInitialized.current) {
      hasInitialized.current = true;
      initMutation.mutate();
    }
  }, [isAuthenticated]);
}
