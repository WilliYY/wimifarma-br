FROM node:24-bookworm-slim AS base
WORKDIR /app

RUN apt-get update -y && \
  apt-get install -y --no-install-recommends ca-certificates openssl && \
  rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM deps AS tools
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN npm run prisma:generate

CMD ["npm", "run", "prisma:deploy"]

FROM base AS runner
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs && \
  useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p /app/public/uploads/products /app/var/private-supplier-images && \
  chown -R nextjs:nodejs /app/public/uploads /app/var/private-supplier-images && \
  chmod 700 /app/var/private-supplier-images

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
