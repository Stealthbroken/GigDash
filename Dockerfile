# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NODE_ENV=production \
    CI=1

RUN corepack enable

WORKDIR /app

# Copy lockfile + manifests first so dep installs are cached when only code changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json tsconfig.json ./

# Workspace package manifests — copy every package.json so pnpm can resolve the workspace
# graph before we bring in the source.
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-server/package.json       ./lib/api-server/
COPY lib/api-spec/package.json         ./lib/api-spec/
COPY lib/api-zod/package.json          ./lib/api-zod/
COPY lib/db/package.json               ./lib/db/
COPY lib/gigdash/package.json          ./lib/gigdash/
COPY scripts/package.json              ./scripts/

# Install ALL deps (incl. dev) — needed for the build.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

# Now bring in source and build.
COPY . .

# Vite requires BASE_PATH at config-load time. We serve from root.
ENV BASE_PATH=/
RUN pnpm run build

# Place the built SPA next to the bundled API entry so the runtime can resolve it via
# import.meta.dirname/public without env vars.
RUN mkdir -p lib/api-server/dist/public && \
    cp -r lib/gigdash/dist/public/. lib/api-server/dist/public/


# ---------- Runtime stage ----------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# The API is fully bundled by esbuild, so we only need the bundle + the static SPA.
COPY --from=build /app/lib/api-server/dist ./lib/api-server/dist
COPY --from=build /app/package.json ./package.json

EXPOSE 8080

CMD ["node", "--enable-source-maps", "lib/api-server/dist/index.mjs"]
