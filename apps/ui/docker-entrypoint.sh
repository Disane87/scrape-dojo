#!/bin/sh
# This script can be used to inject environment variables into the Angular app at runtime
# Place this in your Docker image and call it before starting the app

# Create the environment config file
cat > /usr/share/nginx/html/assets/env-config.js << EOF
window.DEFAULT_LANGUAGE = '${DEFAULT_LANGUAGE:-en}';
EOF

# Start nginx
nginx -g 'daemon off;'
