$ErrorActionPreference = "Continue"

$PROJECT_ID = "sterling-ai-workshop"

Write-Host "Deleting VoiceAI resources from project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

Write-Host "1. Deleting Cloud Run services..."
gcloud run services delete voiceai-api --region=asia-south1 --quiet
gcloud run services delete voiceai-frontend --region=europe-west1 --quiet
gcloud run services delete voiceai-frontend --region=asia-south1 --quiet

Write-Host "2. Deleting Cloud SQL instance..."
gcloud sql instances delete voiceai-db --quiet

Write-Host "3. Deleting GCS Bucket..."
gsutil rm -r "gs://voiceai-recordings"

Write-Host "4. Deleting Pub/Sub Topics..."
gcloud pubsub topics delete voiceai-call-events --quiet
gcloud pubsub topics delete voiceai-billing --quiet

Write-Host "5. Deleting Secrets..."
$secrets = @("voiceai-db-password", "voiceai-jwt-secret", "voiceai-db-url", "voiceai-elevenlabs-key", "voiceai-internal-secret")
foreach ($secret in $secrets) {
    gcloud secrets delete $secret --quiet
}

Write-Host "6. Deleting Cloud Build triggers..."
gcloud beta builds triggers delete d4a83201-443c-4386-b417-ca4e85382ecf --quiet

Write-Host "Deletion complete. Switching active project back to aivoice-agent..."
gcloud config set project aivoice-agent
