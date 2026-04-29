#!/bin/bash
# setup-gcp.sh — One-time GCP infrastructure provisioning
# Run once before first deployment
# Usage: bash setup-gcp.sh

set -euo pipefail

PROJECT_ID="sterling-ai-workshop"
REGION="europe-west1"
DB_INSTANCE="voiceai-db"
DB_NAME="voiceai"
DB_USER="voiceai_user"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"
GCS_BUCKET="voiceai-recordings"
PUBSUB_TOPIC_CALLS="voiceai-call-events"
PUBSUB_TOPIC_BILLING="voiceai-billing"

echo "🚀 Setting up VoiceAI GCP infrastructure in project: $PROJECT_ID"

# Set active project
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "📦 Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  pubsub.googleapis.com \
  secretmanager.googleapis.com \
  dns.googleapis.com \
  cloudscheduler.googleapis.com \
  --quiet

# Create Cloud SQL PostgreSQL 15 instance
echo "🐘 Creating Cloud SQL instance..."
gcloud sql instances create "$DB_INSTANCE" \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region="$REGION" \
  --storage-size=10GB \
  --storage-type=SSD \
  --no-backup \
  --quiet || echo "Instance already exists, skipping..."

# Create database and user
gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE" --quiet || true
gcloud sql users create "$DB_USER" \
  --instance="$DB_INSTANCE" \
  --password="$DB_PASSWORD" \
  --quiet || true

echo "✅ DB Password: $DB_PASSWORD (SAVE THIS)"

# Create GCS bucket
echo "🪣 Creating GCS bucket..."
gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://$GCS_BUCKET" || echo "Bucket exists, skipping..."
gsutil lifecycle set - "gs://$GCS_BUCKET" <<EOF
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 90, "matchesPrefix": ["recordings/"]}
    }
  ]
}
EOF

# Create Pub/Sub topics
echo "📨 Creating Pub/Sub topics..."
gcloud pubsub topics create "$PUBSUB_TOPIC_CALLS" --quiet || true
gcloud pubsub topics create "$PUBSUB_TOPIC_BILLING" --quiet || true

# Store secrets in Secret Manager
echo "🔐 Storing secrets..."
echo -n "$DB_PASSWORD" | gcloud secrets create voiceai-db-password --data-file=- --quiet || \
  echo -n "$DB_PASSWORD" | gcloud secrets versions add voiceai-db-password --data-file=-

echo ""
echo "✅ GCP infrastructure setup complete!"
echo "Next: Fill in your .env files and run deploy-api.sh + deploy-frontend.sh"
