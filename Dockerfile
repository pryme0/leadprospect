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
# su-exec lets the entrypoint drop from root to nextjs after fixing volume perms.
RUN apk add --no-cache su-exec

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Next's standalone output does NOT bundle `sharp` — it's loaded at runtime, so
# @vercel/nft can't trace it, and image optimization then throws
# "'sharp' is required … in standalone mode". Install it into the standalone's
# node_modules here (as root, before switching to the nextjs user). The
# alpine/musl prebuilt binary is fetched automatically. Pinned to match
# package.json so build and runtime use the same version.
RUN npm install --no-save --no-package-lock sharp@0.35.3

# Writable location for the app's SQLite databases (app.db / comms.db / leads.db).
# Mount a PERSISTENT Railway volume at /data to keep data (users, mentions,
# connected accounts, captured leads) across restarts and redeploys — otherwise
# the container filesystem is ephemeral and it's wiped on every restart. The
# entrypoint chowns this to nextjs at startup so a root-owned mounted volume is
# still writable by the app.
RUN mkdir -p /data && chown nextjs:nodejs /data
ENV DATA_DIR=/data

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# NOTE: no `USER nextjs` here — the container starts as root so the entrypoint can
# fix the volume's ownership, then drops to nextjs (via su-exec) to run the app.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
