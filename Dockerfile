# syntax=docker/dockerfile:1

FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm build \
    # The migration script needs only these two packages (neither has dependencies).
    && mkdir -p /migrate/node_modules \
    && cp -rL node_modules/drizzle-orm node_modules/postgres /migrate/node_modules/

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build /app/.output ./.output
COPY --from=build /migrate/node_modules ./node_modules
COPY drizzle ./drizzle
COPY scripts/migrate.ts ./scripts/migrate.ts
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
