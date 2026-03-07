#!/bin/bash
# ============================================
# Scrape Dojo - Docker Entrypoint
# Supports PUID/PGID for custom user/group IDs
# ============================================

PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "───────────────────────────────────────"
echo " Scrape Dojo - Starting up"
echo " PUID: ${PUID}"
echo " PGID: ${PGID}"
echo "───────────────────────────────────────"

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

# Fix ownership of application directories
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
    /run \
    /usr/share/nginx/html

echo "Starting services..."
exec "$@"
