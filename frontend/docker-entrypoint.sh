#!/bin/sh

# Default values from environment variables or defaults
GOOGLE_LOGIN=${VITE_GOOGLE_LOGIN_ENABLED:-true}
API_URL=${VITE_API_URL:-http://localhost:4000}

# Write runtime config
cat <<EOF > /usr/share/nginx/html/config.js
window.env = {
  GOOGLE_LOGIN_ENABLED: "$GOOGLE_LOGIN",
  API_URL: "$API_URL"
};
EOF

# Execute the CMD
exec "$@"
