#!/bin/bash
# run-migrations.sh — Run DB migrations via Cloud SQL Auth Proxy
set -euo pipefail

PROJECT_ID="sterling-ai-workshop"
REGION="europe-west1"
DB_INSTANCE="$PROJECT_ID:$REGION:voiceai-db"
DB_NAME="voiceai"
DB_USER="voiceai_user"

echo "🔌 Starting Cloud SQL Auth Proxy..."
cloud_sql_proxy -instances="$DB_INSTANCE"=tcp:5432 &
PROXY_PID=$!
sleep 3

echo "🗄️ Running migrations..."
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

for f in "$(dirname "$0")/../voiceai-api/database/migrations"/*.sql; do
  echo "  → Running $f"
  psql "$DATABASE_URL" -f "$f"
done

echo "✅ Migrations complete"
kill $PROXY_PID
