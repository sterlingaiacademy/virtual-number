$ErrorActionPreference = "Stop"
$PROJECT_ID = "aivoice-agent"
$REGION = "asia-south1"
$SERVICE_NAME = "voiceai-api"
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE_NAME"
$DB_INSTANCE = "${PROJECT_ID}:${REGION}:voiceai-db"

Write-Host "Building API image..."
Push-Location "$PSScriptRoot\..\voiceai-api"
gcloud builds submit --tag $IMAGE .

Write-Host "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 10 `
  --add-cloudsql-instances $DB_INSTANCE `
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID,FRONTEND_URL=https://voiceai-frontend-niiorsa2ra-el.a.run.app" `
  --set-secrets "JWT_SECRET=voiceai-jwt-secret:latest,DATABASE_URL=voiceai-db-url:latest,ELEVENLABS_API_KEY=voiceai-elevenlabs-key:latest,INTERNAL_API_SECRET=voiceai-internal-secret:latest" `
  --quiet

$API_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'
Write-Host "API deployed: $API_URL"
Pop-Location
