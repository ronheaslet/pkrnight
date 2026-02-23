# Stage 1 — Build the React frontend
FROM oven/bun:1 AS web-builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
RUN bun install

COPY apps/web/ apps/web/
COPY packages/ packages/
RUN cd apps/web && bun run build

# Stage 2 — Build the API + bundle frontend
FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
RUN bun install

COPY packages/ packages/
COPY apps/api/ apps/api/

# Copy built frontend into API's public directory
COPY --from=web-builder /app/apps/web/dist ./public

# Generate Prisma client
RUN cd packages/db && bunx prisma generate --schema prisma/schema.prisma

EXPOSE 3001

CMD ["bun", "run", "apps/api/src/index.ts"]
