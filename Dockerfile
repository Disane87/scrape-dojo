# ============================================
# Scrape Dojo - Combined Dockerfile
# Single image: API (NestJS + Puppeteer) + UI (Angular via nginx)
# Multi-arch: linux/amd64, linux/arm64
# ============================================

# Stage 1: Build everything
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install ALL dependencies (needed for build)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy workspace config and source files
COPY nx.json tsconfig.json tsconfig.build.json ./
COPY jest.preset.js ./
COPY nest-cli.json ./
COPY .postcssrc.json ./
COPY apps ./apps
COPY libs ./libs
COPY config ./config

# Build API and UI (daemon disabled to avoid SQLite issues in Docker)
RUN NX_DAEMON=false pnpm nx build api --configuration=production --verbose && \
    NX_DAEMON=false pnpm nx build ui --configuration=production --verbose

# Stage 2: Production dependencies only (avoids unreliable pnpm prune)
FROM node:22-slim AS prod-deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/docs/package.json ./apps/docs/package.json

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --no-frozen-lockfile --ignore-scripts

# Stage 3: Production - Puppeteer base with nginx
FROM ghcr.io/puppeteer/puppeteer:23.11.1 AS production

# Switch to root for system package installation
USER root

# Install nginx and supervisor
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx supervisor && \
    rm -rf /var/lib/apt/lists/*

# Mark as Docker environment
ENV DOCKER_ENV=true
ENV NODE_ENV=production

# Disable Chrome crash reporting
ENV CHROME_CRASHPAD_HANDLER_TRACING_ENABLED=false
ENV GOOGLE_CRASH_HANDLER_URL=""

# API listens on 3000 internally, nginx on 80
ENV SCRAPE_DOJO_PORT=3000

WORKDIR /home/pptruser/app

# Create runtime directories
RUN mkdir -p /home/pptruser/app/data \
    /home/pptruser/app/downloads \
    /home/pptruser/app/documents \
    /home/pptruser/app/logs \
    /home/pptruser/app/browser-data \
    /home/pptruser/app/dist \
    /home/pptruser/app/config

# Copy built API
COPY --from=builder --chown=pptruser:pptruser /app/dist/apps/api ./dist
COPY --from=prod-deps --chown=pptruser:pptruser /app/node_modules ./node_modules

# Copy config files
COPY --chown=pptruser:pptruser config ./config

# Copy built UI to nginx html directory
COPY --from=builder /app/dist/apps/ui/browser /usr/share/nginx/html

# Copy nginx config for combined mode
COPY apps/ui/nginx.combined.conf /etc/nginx/nginx.conf

# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set permissions for nginx directories
RUN chown -R pptruser:pptruser /var/log/nginx /var/lib/nginx /run && \
    chown -R pptruser:pptruser /home/pptruser/app && \
    chown -R pptruser:pptruser /usr/share/nginx/html

# Switch to non-root user for Chrome installation
USER pptruser

# Install Chrome for Puppeteer
RUN npx puppeteer browsers install chrome --path /home/pptruser/.cache/puppeteer

# PUID/PGID support: default to pptruser's UID/GID (1000)
ENV PUID=1000
ENV PGID=1000

# Expose single port
EXPOSE 80

# Health check via nginx
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:80/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Entrypoint runs as root to adjust UID/GID, then execs CMD
USER root
ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
