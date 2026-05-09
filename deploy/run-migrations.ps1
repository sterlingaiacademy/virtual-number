$ErrorActionPreference = "Stop"

$PROJECT_ID = "aivoice-agent"
$REGION = "asia-south1"
$DB_INSTANCE = "${PROJECT_ID}:${REGION}:voiceai-db"
$DB_NAME = "voiceai"
$DB_USER = "voiceai_user"

if (-not $env:DB_PASSWORD) {
    Write-Error "Please set the DB_PASSWORD environment variable before running this script."
    exit 1
}

# Get Public IP of DB instance
$DB_IP = (gcloud sql instances describe voiceai-db --format="value(ipAddresses[0].ipAddress)")

Write-Host "Running migrations via Node.js..."
$encPass = [uri]::EscapeDataString($env:DB_PASSWORD)
$env:DATABASE_URL = "postgresql://$DB_USER`:$encPass@$DB_IP`:5432/$DB_NAME"

Push-Location "$PSScriptRoot\..\voiceai-api"
node src/scripts/migrate.js
Pop-Location

Write-Host "Migrations complete."
