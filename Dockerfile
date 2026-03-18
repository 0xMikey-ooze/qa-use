FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
ENV DATABASE_URL=postgresql://placeholder:x@localhost/placeholder
ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/lib/db ./src/lib/db
EXPOSE 3000
ENV PORT=3000
CMD ["sh", "-c", "npm run db:push 2>/dev/null || true && npm start"]

