#!/bin/sh

# Default values from environment variables or defaults
API_URL=${VITE_API_URL:-http://localhost:4000}

# Write runtime config
cat <<EOF > /usr/share/nginx/html/config.js
window.env = {
  API_URL: "$API_URL"
};
EOF

# Execute the CMD
exec "$@"
