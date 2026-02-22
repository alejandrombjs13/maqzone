# syntax=docker/dockerfile:1

# ── Dependencias ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Desarrollo local ──────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npx", "next", "dev", "--hostname", "0.0.0.0"]

# ── Build de producción ───────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* se hornean en el bundle al compilar — viene como build arg
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NODE_ENV=production
# Limitar uso de memoria de Node.js para VPS con poca RAM
ENV NODE_OPTIONS="--max-old-space-size=1536"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Limpiar cualquier build anterior antes de compilar
RUN rm -rf .next && npm run build

# Verificar que el build generó los archivos críticos
RUN test -f .next/standalone/server.js || (echo "ERROR: build incompleto, falta server.js" && exit 1)
RUN test -d .next/static               || (echo "ERROR: build incompleto, falta .next/static" && exit 1)

# ── Runner de producción (imagen final mínima) ────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
