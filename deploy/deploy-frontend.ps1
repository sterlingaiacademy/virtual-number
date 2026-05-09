$ErrorActionPreference = "Stop"
$PROJECT_ID = "aivoice-agent"
$REGION = "asia-south1"
$SERVICE_NAME = "voiceai-frontend"
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "Setting API URL for Next.js build..."
Push-Location "$PSScriptRoot\..\voiceai-frontend"
Set-Content -Path ".env.production" -Value "NEXT_PUBLIC_API_URL=https://voiceai-api-niiorsa2ra-el.a.run.app"

Write-Host "Building frontend image..."
gcloud builds submit --tag $IMAGE .

Write-Host "Deploying frontend to Cloud Run..."
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 3000 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 5 `
  --set-env-vars "NEXT_PUBLIC_API_URL=https://voiceai-api-niiorsa2ra-el.a.run.app" `
  --quiet

$FRONTEND_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'
Write-Host "Frontend deployed: $FRONTEND_URL"
Pop-Location
