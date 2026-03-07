#!/bin/bash
# ============================================
# Scrape Dojo - Docker Entrypoint
# Supports PUID/PGID/UMASK for custom user/group IDs and file permissions
# ============================================

PUID=${PUID:-1000}
PGID=${PGID:-1000}
UMASK=${UMASK:-022}

echo "───────────────────────────────────────"
echo " Scrape Dojo - Starting up"
echo " PUID:  ${PUID}"
echo " PGID:  ${PGID}"
echo " UMASK: ${UMASK}"
echo "───────────────────────────────────────"

# Apply umask
umask "$UMASK"

# Get current UID/GID of pptruser
CURRENT_UID=$(id -u pptruser)
CURRENT_GID=$(id -g pptruser)

# Update group ID if different
if [ "$PGID" != "$CURRENT_GID" ]; then
    echo "Updating pptruser group ID from ${CURRENT_GID} to ${PGID}..."
    groupmod -o -g "$PGID" pptruser
fi

# Update user ID if different
if [ "$PUID" != "$CURRENT_UID" ]; then
    echo "Updating pptruser user ID from ${CURRENT_UID} to ${PUID}..."
    usermod -o -u "$PUID" pptruser
fi

# Fix ownership of application directories (writable at runtime)
echo "Adjusting file permissions..."
chown -R pptruser:pptruser \
    /home/pptruser/app/data \
    /home/pptruser/app/downloads \
    /home/pptruser/app/documents \
    /home/pptruser/app/logs \
    /home/pptruser/app/browser-data \
    /home/pptruser/app/config \
    /var/log/nginx \
    /var/lib/nginx \
    /run

# Only re-chown read-only app files when PUID actually changed
if [ "$PUID" != "$CURRENT_UID" ] || [ "$PGID" != "$CURRENT_GID" ]; then
    echo "PUID/PGID changed — fixing ownership of app files and Chrome..."
    chown -R pptruser:pptruser \
        /home/pptruser/app/dist \
        /home/pptruser/app/node_modules \
        /home/pptruser/.cache \
        /usr/share/nginx/html
fi

# Ensure log files exist and are writable by supervisord (runs as root)
touch /home/pptruser/app/logs/api.stdout.log \
      /home/pptruser/app/logs/api.stderr.log \
      /home/pptruser/app/logs/nginx.stdout.log \
      /home/pptruser/app/logs/nginx.stderr.log
chown pptruser:pptruser /home/pptruser/app/logs/*.log

echo "Starting services..."
exec "$@"
