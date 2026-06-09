import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Vite/Replit proxies forward requests — needed for correct secure cookies in production
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use("/api", router);

// In production, serve the built Vite SPA from this same process. Static assets first,
// then a catch-all that returns index.html so client-side routes work on hard refresh.
// STATIC_DIR can override the location; default sits next to the bundled API entry point.
if (process.env.NODE_ENV === "production") {
  const defaultStaticDir = path.resolve(__dirname, "public");
  const staticDir = process.env.STATIC_DIR ?? defaultStaticDir;

  if (existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false, maxAge: "1h" }));

    app.get(/^\/(?!api(?:\/|$)).*/, (_req: Request, res: Response, next: NextFunction) => {
      const indexFile = path.join(staticDir, "index.html");
      if (!existsSync(indexFile)) return next();
      res.sendFile(indexFile);
    });
  } else {
    logger.warn({ staticDir }, "STATIC_DIR not found — SPA will not be served");
  }
}

// Global error handler - ensures DB and other errors are logged with full details
app.use((err: any, req: any, res: any, _next: any) => {
  req.log?.error?.({ err }, "Unhandled route error");
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
