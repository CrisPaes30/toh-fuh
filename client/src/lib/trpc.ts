// client/src/lib/trpc.ts
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      loggerLink(),
      httpBatchLink({
        url: "/api/trpc",
        // se precisar enviar cookie/auth:
        // fetch(url, options) { return fetch(url, { ...options, credentials: "include" }); }
      }),
    ],
  });
}
