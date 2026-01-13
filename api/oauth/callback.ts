import express from "express";

// ajuste este import para o caminho real:
import { registerOAuthRoutes } from "../../server/_core/oauth";

const app = express();
registerOAuthRoutes(app);

export default (req: any, res: any) => app(req, res);
