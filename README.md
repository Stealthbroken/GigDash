# GigDash

**Live music, one dashboard** — artists find gigs, venues book talent, fans discover shows on a map.

Built as a TypeScript monorepo (React + Express + PostgreSQL) for high school comp sci teams working with GitHub and AI-assisted development.

---

## Team documentation (start here)

Open the project in **VS Code**, then read:

**[docs/README.md](./docs/README.md)** — full guide hub with pretty Markdown preview

| Guide | Topic |
|-------|--------|
| [Getting Started](./docs/getting-started.md) | Install, run locally, shared database |
| [Understanding GigDash](./docs/understanding-gigdash.md) | Architecture and file map |
| [Vibe Coding](./docs/vibe-coding.md) | Build features with AI assistants |
| [GitHub Collaboration](./docs/github-collaboration.md) | Branches, PRs, reviews |
| [Recipe Book](./docs/recipe-book.md) | Common change workflows |
| [Team Playbook](./docs/team-playbook.md) | Issues, meetings, demos |

**Preview in VS Code:** open any doc → `Ctrl+Shift+V` (custom dark theme included).

---

## Quick run

```bash
pnpm install
cp .env.example .env   # add DATABASE_URL; set API_PORT=5000 and FRONTEND_PORT=5173

pnpm dev   # starts API + frontend together (different ports)
```

Or run separately: `pnpm --filter @workspace/api-server run dev` and `pnpm --filter @workspace/gigdash run dev`.

```bash
pnpm run typecheck     # before opening a PR
```

---

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React, Vite, Tailwind, shadcn/ui, Leaflet
- API: Express 5, OpenAPI + Orval codegen
- DB: PostgreSQL (Neon) + Drizzle ORM

See [replit.md](./replit.md) for operator notes.