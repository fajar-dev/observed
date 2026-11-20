# syntax=docker/dockerfile:1
ARG BUN_VERSION=1.4.4
FROM oven/bun:${BUN_VERSION}-slim AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY patches ./patches
# Nuxt's project preparation runs after the application source is available.
RUN bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS build
COPY . .
ENV NUXT_TELEMETRY_DISABLED=1
RUN bun run --bun build

FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
LABEL org.opencontainers.image.title="Observed" \
      org.opencontainers.image.description="Structural health monitoring dashboards and sensor alerts" \
      org.opencontainers.image.source="https://github.com/fajar-dev/observed"
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    TZ=UTC
COPY --from=build --chown=bun:bun /app/.output ./.output
COPY --chown=bun:bun docker/environment.mjs docker/preload.mjs docker/healthcheck.mjs ./docker/
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD ["bun", "./docker/healthcheck.mjs"]
CMD ["bun", "--preload", "./docker/preload.mjs", "./.output/server/index.mjs"]
