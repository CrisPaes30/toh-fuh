import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getFirebaseAuth } from "../firebase";

export type TrpcUser = {
  openId: string;
  name: string;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: TrpcUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: TrpcUser | null = null;

  try {
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.slice(7);
      const firebaseAuth = getFirebaseAuth();
      if (firebaseAuth) {
        const decoded = await firebaseAuth.verifyIdToken(idToken);
        user = {
          openId: decoded.uid,
          name: decoded.name ?? decoded.email ?? "",
        };
      }
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
