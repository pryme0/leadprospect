FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GTM_ID
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID
ARG NEXT_PUBLIC_AMPLITUDE_API_KEY
ENV NEXT_PUBLIC_AMPLITUDE_API_KEY=$NEXT_PUBLIC_AMPLITUDE_API_KEY
ARG NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE
ENV NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE=$NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE
# NEXT_PUBLIC_* are inlined into the client bundle at BUILD time, so they MUST be
# passed as build args here (Railway forwards matching service variables to
# declared ARGs). Setting them only in the runtime env has no effect on the
# browser code — this is why the Paystack public key read "not configured".
ARG NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
ENV NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_NGN_RATE
ENV NEXT_PUBLIC_NGN_RATE=$NEXT_PUBLIC_NGN_RATE
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_TAWKTO_WIDGET_ID
ENV NEXT_PUBLIC_TAWKTO_WIDGET_ID=$NEXT_PUBLIC_TAWKTO_WIDGET_ID
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Writable location for the app's SQLite databases (app.db / comms.db / leads.db).
# /app is root-owned and the app runs as the non-root `nextjs` user, so it cannot
# create DB files there (SQLITE_CANTOPEN). This dir is owned by nextjs and is the
# default DATA_DIR. Mount a persistent Railway volume at /data to keep data across
# redeploys — otherwise it is writable but ephemeral.
RUN mkdir -p /data && chown nextjs:nodejs /data
ENV DATA_DIR=/data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
