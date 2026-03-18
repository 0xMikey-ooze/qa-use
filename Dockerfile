FROM node:23-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile

# Builder --------------------------------------------------------------------

FROM node:23-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build

# Runner ---------------------------------------------------------------------

FROM node:23-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
ENV NODE_ENV=production


COPY --from=builder /app ./

EXPOSE 3000

CMD ["pnpm", "start"]
