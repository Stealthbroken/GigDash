import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/** Frontend dev server port. `PORT` fallback supports Replit (frontend service sets PORT). */
const rawFrontendPort = process.env.FRONTEND_PORT ?? process.env.PORT ?? "5173";
const port = Number(rawFrontendPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid frontend port value: "${rawFrontendPort}"`);
}

/** API port for dev proxy (API server). Not the same as the Vite `PORT` on Replit. */
const rawApiPort = process.env.API_PORT ?? "5000";
const apiPort = Number(rawApiPort);

if (Number.isNaN(apiPort) || apiPort <= 0) {
  throw new Error(`Invalid API port value: "${rawApiPort}"`);
}

if (port === apiPort) {
  throw new Error(
    `Frontend port (${port}) and API port (${apiPort}) must be different. ` +
      `Set FRONTEND_PORT and API_PORT in .env (e.g. 5173 and 5000).`,
  );
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    // Force a single instance of these packages across the workspace. Without this,
    // @workspace/api-client-react gets its own copy of @tanstack/react-query and the
    // QueryClientProvider mounted in App.tsx sets context on a different copy than
    // the generated hooks read from, causing "No QueryClient set" in prod builds.
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        cookieDomainRewrite: "",
        cookiePathRewrite: "/",
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
