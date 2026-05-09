$ErrorActionPreference = "Stop"

$PROJECT_ID = "aivoice-agent"
$REGION = "asia-south1"
$DB_INSTANCE = "voiceai-db"
$DB_NAME = "voiceai"
$DB_USER = "voiceai_user"

# Generate a random 32-character base64 password
$bytes = New-Object Byte[] 24
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$DB_PASSWORD = [Convert]::ToBase64String($bytes)

$GCS_BUCKET = "voiceai-recordings"
$PUBSUB_TOPIC_CALLS = "voiceai-call-events"
$PUBSUB_TOPIC_BILLING = "voiceai-billing"

Write-Host "Setting up VoiceAI GCP infrastructure in project: $PROJECT_ID"
# Set active project
gcloud config set project $PROJECT_ID
# Enable required APIs
Write-Host "Enabling APIs..."
gcloud services enable run.googleapis.com sqladmin.googleapis.com storage.googleapis.com pubsub.googleapis.com secretmanager.googleapis.com dns.googleapis.com cloudscheduler.googleapis.com --quiet
# Create Cloud SQL PostgreSQL 15 instance
Write-Host "Creating Cloud SQL instance..."
try {
    gcloud sql instances create $DB_INSTANCE --database-version=POSTGRES_15 --tier=db-f1-micro --region=$REGION --storage-size=10GB --storage-type=SSD --no-backup --quiet
} catch {
    Write-Host "Instance might already exist, continuing..."
}
# Create database and user
try {
    gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE --quiet
} catch { }
try {
    gcloud sql users create $DB_USER --instance=$DB_INSTANCE --password=$DB_PASSWORD --quiet
} catch { }
Write-Host "DB Password: $DB_PASSWORD (SAVE THIS)"
# Create GCS bucket
Write-Host "Creating GCS bucket..."
try {
    gsutil mb -p $PROJECT_ID -l $REGION "gs://$GCS_BUCKET"
} catch {
    Write-Host "Bucket might already exist, continuing..."
}
# Set lifecycle rule using a temporary file
$lifecycleJson = '{ "rule": [ { "action": {"type": "Delete"}, "condition": {"age": 90, "matchesPrefix": ["recordings/"]} } ] }'
$lifecycleFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $lifecycleFile -Value $lifecycleJson
gsutil lifecycle set $lifecycleFile "gs://$GCS_BUCKET"
Remove-Item $lifecycleFile
# Create Pub/Sub topics
Write-Host "Creating Pub/Sub topics..."
try { gcloud pubsub topics create $PUBSUB_TOPIC_CALLS --quiet } catch { }
try { gcloud pubsub topics create $PUBSUB_TOPIC_BILLING --quiet } catch { }
# Store secrets in Secret Manager
Write-Host "Storing secrets..."
$secretFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $secretFile -Value $DB_PASSWORD -NoNewline
try {
    gcloud secrets create voiceai-db-password --data-file=$secretFile --quiet
} catch {
    gcloud secrets versions add voiceai-db-password --data-file=$secretFile
}
Remove-Item $secretFile
Write-Host "GCP infrastructure setup complete!"
Write-Host "Next: Fill in your .env files and run deploy-api.ps1 + deploy-frontend.ps1"
