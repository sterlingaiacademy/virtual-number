#!/bin/bash
# setup-dns.sh — Configure Cloud DNS for VoiceAI domains
set -euo pipefail

PROJECT_ID="sterling-ai-workshop"
ZONE_NAME="sterlingaiacademy-zone"
DOMAIN="sterlingaiacademy.com."

# You will need to replace these with the actual IPs/URLs after deployment
SIP_IP="34.180.63.117"
API_DOMAIN="api.sterlingaiacademy.com."
FRONTEND_DOMAIN="app.sterlingaiacademy.com."

echo "🌐 Setting up Cloud DNS for $DOMAIN"

# Create DNS managed zone if it doesn't exist
gcloud dns managed-zones create "$ZONE_NAME" \
  --description="VoiceAI SaaS DNS zone" \
  --dns-name="$DOMAIN" \
  --visibility="public" \
  --project="$PROJECT_ID" \
  --quiet || echo "Zone already exists."

echo "📝 Adding DNS records..."

# Start a transaction
gcloud dns record-sets transaction start --zone="$ZONE_NAME" --project="$PROJECT_ID"

# 1. SIP VM (A Record)
gcloud dns record-sets transaction add "$SIP_IP" \
  --name="sip.$DOMAIN" \
  --ttl="300" \
  --type="A" \
  --zone="$ZONE_NAME" \
  --project="$PROJECT_ID"

# 2. API / Backend (CNAME to Cloud Run mapping)
# Note: Requires Cloud Run domain mapping to be set up first
# gcloud run domain-mappings create --service=voiceai-api --domain=api.sterlingaiacademy.com
gcloud dns record-sets transaction add "ghs.googlehosted.com." \
  --name="$API_DOMAIN" \
  --ttl="300" \
  --type="CNAME" \
  --zone="$ZONE_NAME" \
  --project="$PROJECT_ID"

# 3. Frontend (CNAME to Cloud Run mapping)
gcloud dns record-sets transaction add "ghs.googlehosted.com." \
  --name="$FRONTEND_DOMAIN" \
  --ttl="300" \
  --type="CNAME" \
  --zone="$ZONE_NAME" \
  --project="$PROJECT_ID"

# Execute transaction
gcloud dns record-sets transaction execute --zone="$ZONE_NAME" --project="$PROJECT_ID"

echo "✅ DNS setup complete! Make sure your domain registrar points to Google Cloud nameservers."
gcloud dns managed-zones describe "$ZONE_NAME" --project="$PROJECT_ID" --format="value(nameServers)"
