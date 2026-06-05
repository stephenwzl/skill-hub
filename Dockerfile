FROM node:22-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

ENV TRANSFORMERS_CACHE_DIR=/app/.cache/transformers
COPY scripts/preload-embedding-model.mjs ./scripts/preload-embedding-model.mjs
RUN mkdir -p "$TRANSFORMERS_CACHE_DIR" \
  && node scripts/preload-embedding-model.mjs

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV TRANSFORMERS_CACHE_DIR=/app/.cache/transformers
ENV SELF_HOSTED=true

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=deps --chown=node:node /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=deps --chown=node:node /app/node_modules/onnxruntime-common ./node_modules/onnxruntime-common
COPY --from=deps --chown=node:node /app/.cache/transformers /app/.cache/transformers

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000

CMD ["node", "server.js"]
