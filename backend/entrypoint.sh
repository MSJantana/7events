#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting backend entrypoint script..."

# Check if DATABASE_URL is set, if not try to construct it from individual variables
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not found, checking for individual variables..."
  
  if [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ]; then
    # Default port to 3306 if not set
    DB_PORT=${DB_PORT:-3306}
    
    echo "Constructing DATABASE_URL from DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME..."
    export DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  else
    echo "Warning: DATABASE_URL is not set and individual DB variables are missing."
    echo "Prisma might fail if it cannot connect to the database."
  fi
fi

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Apply migrations
echo "Applying database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting application..."
exec "$@"
