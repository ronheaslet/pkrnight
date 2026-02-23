# PKR Night v3

Poker club management platform.

## Structure

- `apps/web` — React + Vite + Tailwind frontend
- `apps/api` — Hono + Bun backend
- `packages/db` — Prisma schema and client
- `packages/types` — Shared TypeScript types

## Setup

1. Copy `.env.example` to `.env` and fill in values
2. Run `bunx prisma migrate dev --schema packages/db/prisma/schema.prisma`
3. Run `bun packages/db/src/seed.ts`
4. Start API: `bun run apps/api/src/index.ts`
5. Start Web: `bun run --cwd apps/web dev`
