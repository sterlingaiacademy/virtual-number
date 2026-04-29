#!/bin/bash
# deploy-frontend.sh — Build and deploy voiceai-frontend to Cloud Run
set -euo pipefail

PROJECT_ID="sterling-ai-workshop"
REGION="europe-west1"
SERVICE_NAME="voiceai-frontend"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🔨 Building frontend image..."
cd "$(dirname "$0")/../voiceai-frontend"
gcloud builds submit --tag "$IMAGE" .

echo "🚀 Deploying frontend to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://api.sterlingaiacademy.com" \
  --quiet

FRONTEND_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
echo "✅ Frontend deployed: $FRONTEND_URL"
