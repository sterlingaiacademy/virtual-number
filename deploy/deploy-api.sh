#!/bin/bash
# deploy-api.sh — Build and deploy voiceai-api to Cloud Run
set -euo pipefail

PROJECT_ID="sterling-ai-workshop"
REGION="europe-west1"
SERVICE_NAME="voiceai-api"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"
DB_INSTANCE="$PROJECT_ID:$REGION:voiceai-db"

echo "🔨 Building API image..."
cd "$(dirname "$0")/../voiceai-api"
gcloud builds submit --tag "$IMAGE" .

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --add-cloudsql-instances "$DB_INSTANCE" \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID" \
  --set-secrets "JWT_SECRET=voiceai-jwt-secret:latest,DATABASE_URL=voiceai-db-url:latest,ELEVENLABS_API_KEY=voiceai-elevenlabs-key:latest,INTERNAL_API_SECRET=voiceai-internal-secret:latest" \
  --quiet

API_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
echo "✅ API deployed: $API_URL"
