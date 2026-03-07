# ============================================
# Scrape Dojo API - Dockerfile
# Multi-stage build for production
# ============================================

# Stage 1: Build
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy all workspace files needed for Nx build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.json tsconfig.build.json ./
COPY jest.preset.js ./
COPY nest-cli.json ./

# Copy all apps and libs (Nx needs full workspace context)
COPY apps ./apps
COPY libs ./libs
COPY config ./config

# Install ALL dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# Build the API
RUN pnpm nx build api --configuration=production --verbose

# Prune to production-only dependencies (removes devDependencies)
RUN CI=true pnpm prune --prod

# Stage 2: Production - Use official Puppeteer image
# This image has Chrome pre-installed and all dependencies configured
FROM ghcr.io/puppeteer/puppeteer:23.11.1 AS production

# Switch to root for system setup
USER root

# Install gosu for stepping down from root after UID/GID adjustment
RUN apt-get update && \
    apt-get install -y --no-install-recommends gosu && \
    rm -rf /var/lib/apt/lists/*

# Mark as running in Docker for special handling
ENV DOCKER_ENV=true
ENV NODE_ENV=production

# Disable Chrome crash reporting (fixes crashpad_handler errors)
ENV CHROME_CRASHPAD_HANDLER_TRACING_ENABLED=false
ENV GOOGLE_CRASH_HANDLER_URL=""

# The official Puppeteer image already runs as 'pptruser' (non-root)
# Set proper working directory
WORKDIR /home/pptruser/app

# Create directories for runtime data
RUN mkdir -p /home/pptruser/app/data \
    /home/pptruser/app/downloads \
    /home/pptruser/app/documents \
    /home/pptruser/app/logs \
    /home/pptruser/app/browser-data \
    /home/pptruser/app/dist \
    /home/pptruser/app/config

# Copy built application (change ownership to pptruser)
COPY --from=builder --chown=pptruser:pptruser /app/dist/apps/api ./dist
COPY --from=builder --chown=pptruser:pptruser /app/node_modules ./node_modules

# Copy config files (will be mounted in production)
COPY --chown=pptruser:pptruser config ./config

# Copy entrypoint script
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Switch to non-root user for Chrome installation
USER pptruser

# Install Chrome for Puppeteer in the correct cache directory
RUN npx puppeteer browsers install chrome --path /home/pptruser/.cache/puppeteer

# PUID/PGID/UMASK support for NAS systems (Unraid, Synology, etc.)
ENV PUID=1000
ENV PGID=1000
ENV UMASK=022

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Entrypoint runs as root to adjust UID/GID, then drops to pptruser via gosu
USER root
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
