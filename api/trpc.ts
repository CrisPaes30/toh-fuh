import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// ajuste estes imports para o caminho real no seu repo:
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Vercel Node Function handler
export default (req: any, res: any) => app(req, res);
