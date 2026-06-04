# Getting Started with GigDash

This guide gets you from **zero** to **app running in the browser**, whether you use VS Code on your laptop or Replit in the browser.

---

## What you're running

GigDash is not one program — it's a **monorepo** (many small packages in one Git repo):

| Piece | Package | What it does |
|-------|---------|--------------|
| Website | `@workspace/gigdash` | React UI — pages, map, login |
| API server | `@workspace/api-server` | Express server — auth, events, venues |
| Database layer | `@workspace/db` | PostgreSQL schema (Drizzle ORM) |
| API contract | `@workspace/api-spec` | OpenAPI file — defines endpoints |
| Generated hooks | `@workspace/api-client-react` | Auto-generated React hooks for the API |

```mermaid
flowchart TB
  Browser[Your browser]
  Vite[Vite dev server - gigdash]
  API["Express API (API_PORT, default 5000)"]
  DB[(Neon PostgreSQL)]

  Browser --> Vite
  Vite --> API
  API --> DB
```

---

## What you need installed

| Tool | Why | How to check |
|------|-----|--------------|
| **Node.js 24+** | Runs JavaScript on your computer | `node --version` |
| **pnpm** | Installs packages across the monorepo | `pnpm --version` |
| **Git** | Clone, branch, push to GitHub | `git --version` |

Install pnpm if you don't have it:

```bash
npm install -g pnpm
```

> **Replit users:** Node and pnpm are usually already set up. Focus on Secrets (env vars) and the Git panel.

---

## First-time setup (every teammate)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_ORG/gigdash.git
cd gigdash
```

Replace `YOUR_ORG/gigdash` with your team's real GitHub URL.

### 2. Install dependencies

```bash
pnpm install
```

This reads all `package.json` files in `lib/*` and installs everything once at the root.

### 3. Environment variables

Copy the example file:

```bash
cp .env.example .env
```

Your team lead shares two values (never commit `.env` to GitHub):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Connection string to your **shared** Neon PostgreSQL database |
| `SESSION_SECRET` | Random string for login cookies (each dev can use their own locally) |

Example `.env`:

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/gigdash?sslmode=require"
SESSION_SECRET="your-random-32-char-hex-string"
API_PORT=5000
FRONTEND_PORT=5173
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Push database schema (team lead once, or after schema changes)

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed
```

`seed` fills the database with sample venues, events, and users so the map is not empty.

### 5. Start the servers

**One command (recommended):**

```bash
pnpm dev
```

This starts the **API** (`API_PORT`, default `5000`) and **frontend** (`FRONTEND_PORT`, default `5173`) on separate ports. The frontend proxies `/api` to the API server.

**Or two terminals:**

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/gigdash run dev
```

Open the frontend URL from the terminal output (usually `http://localhost:5173`).

---

## Daily "I'm back for class" routine

```bash
git checkout main
git pull origin main
pnpm install
```

Then start both dev servers again. Pulling first avoids working on old code.

---

## Useful commands cheat sheet

| Command | When to use it |
|---------|----------------|
| `pnpm run typecheck` | Before opening a PR — catches TypeScript errors |
| `pnpm run build` | Before a demo — full build |
| `pnpm --filter @workspace/api-spec run codegen` | After editing `openapi.yaml` |
| `pnpm --filter @workspace/db run push` | After changing schema in `lib/db` |

---

## Troubleshooting

### "Cannot connect to database"

- Check `DATABASE_URL` in `.env` (no extra quotes in Replit Secrets).
- Neon free tier **sleeps** when idle — run a query or wait a few seconds and retry.

### "Port already in use"

Another process is using the port. Close the old terminal or change `API_PORT` / `FRONTEND_PORT` in `.env` (they must be different).

### "Frontend port and API port must be different"

Your `.env` probably sets a single `PORT` used by both. Use separate values:

```env
API_PORT=5000
FRONTEND_PORT=5173
```

### TypeScript errors after pulling

```bash
pnpm install
pnpm run typecheck
```

A teammate may have added packages or changed generated API files.

### Frontend loads but API calls fail

- Confirm the API terminal is running.
- Check the browser **Network** tab — requests should go to `/api/...`.
- Make sure you're logged in for protected pages like `/fan`.

### `pnpm: command not found`

```bash
npm install -g pnpm
```

---

## Replit vs local VS Code

| | Replit | VS Code (local) |
|---|--------|-------------------|
| Best for | Quick demos, no install | Full debugging, AI tools (Cursor) |
| Env vars | Secrets panel | `.env` file |
| Git | Sidebar Git icon | Terminal + GitHub extension |
| Preview | Replit webview | Browser + Vite URL |

Many teams use **Replit for deployment** and **VS Code + GitHub for real collaboration**. Both connect to the same GitHub repo.

---

**Next:** [Understanding GigDash](./understanding-gigdash.md) — learn where each feature lives in the code.