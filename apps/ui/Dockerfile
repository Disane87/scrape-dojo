# ============================================
# Scrape Dojo UI - Dockerfile
# Multi-stage build with nginx for production
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
COPY .postcssrc.json ./

# Copy all apps and libs (Nx needs full workspace context)
COPY apps ./apps
COPY libs ./libs

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the UI with verbose output for debugging
RUN pnpm nx build ui --configuration=production --verbose

# Stage 2: Production with nginx
FROM nginx:alpine AS production

# Copy nginx configuration
COPY apps/ui/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist/apps/ui/browser /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-user nginx-user && \
    chown -R nginx-user:nginx-user /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown nginx-user:nginx-user /var/run/nginx.pid

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
