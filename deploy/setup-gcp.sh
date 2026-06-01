#!/bin/bash
# Setup Google Cloud Project for BelajarBareng AI
# Usage: ./deploy/setup-gcp.sh <PROJECT_ID> <BILLING_ACCOUNT_ID>
#
# Prerequisites: gcloud CLI installed & authenticated (gcloud auth login)

set -e

PROJECT_ID=${1:?"Usage: $0 <PROJECT_ID> <BILLING_ACCOUNT_ID>"}
BILLING_ACCOUNT=${2:?"Usage: $0 <PROJECT_ID> <BILLING_ACCOUNT_ID>"}
REGION="asia-southeast2"
SA_NAME="belajar-bareng-runtime"
BUCKET_NAME="${PROJECT_ID}-uploads"

echo "🔧 Setting up GCP project: ${PROJECT_ID}"
echo ""

# Create project (skip if exists)
if ! gcloud projects describe "${PROJECT_ID}" &>/dev/null; then
  echo "📁 Creating project..."
  gcloud projects create "${PROJECT_ID}" --name="BelajarBareng AI"
else
  echo "📁 Project already exists, skipping creation."
fi

# Link billing
echo "💳 Linking billing account..."
gcloud billing projects link "${PROJECT_ID}" --billing-account="${BILLING_ACCOUNT}"

# Set project
gcloud config set project "${PROJECT_ID}"

# Enable APIs
echo "🔌 Enabling APIs..."
gcloud services enable \
  generativelanguage.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project="${PROJECT_ID}"

# Create Artifact Registry repo
echo "📦 Creating Artifact Registry..."
if ! gcloud artifacts repositories describe app --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud artifacts repositories create app \
    --repository-format=docker \
    --location="${REGION}" \
    --project="${PROJECT_ID}"
fi

# Create Firestore database (Native mode)
echo "🗄️  Creating Firestore database..."
if ! gcloud firestore databases describe --project="${PROJECT_ID}" &>/dev/null; then
  gcloud firestore databases create \
    --location=asia-southeast1 \
    --project="${PROJECT_ID}"
fi

# Create GCS bucket
echo "🪣 Creating Cloud Storage bucket..."
if ! gcloud storage buckets describe "gs://${BUCKET_NAME}" &>/dev/null; then
  gcloud storage buckets create "gs://${BUCKET_NAME}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --uniform-bucket-level-access
fi

# Create service account
echo "👤 Creating service account..."
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="BelajarBareng AI Runtime" \
    --project="${PROJECT_ID}"
fi

# Grant roles
echo "🔑 Granting IAM roles..."
for ROLE in \
  roles/datastore.user \
  roles/storage.objectAdmin \
  roles/aiplatform.user \
  roles/run.invoker; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet
done

# Create AUTH_SECRET (random) in Secret Manager if missing + grant accessor
echo "🔑 Ensuring AUTH_SECRET secret..."
if ! gcloud secrets describe auth-secret --project="${PROJECT_ID}" &>/dev/null; then
  openssl rand -hex 32 | gcloud secrets create auth-secret --data-file=- --project="${PROJECT_ID}"
fi
gcloud secrets add-iam-policy-binding auth-secret \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}" --quiet

# Create key for local dev
echo "🔐 Creating service account key for local dev..."
KEY_FILE="./service-account-key.json"
if [ ! -f "${KEY_FILE}" ]; then
  gcloud iam service-accounts keys create "${KEY_FILE}" \
    --iam-account="${SA_EMAIL}" \
    --project="${PROJECT_ID}"
  echo "   Key saved to ${KEY_FILE}"
else
  echo "   Key file already exists, skipping."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env.local"
echo "  2. Set GEMINI_API_KEY (get from https://aistudio.google.com/apikey)"
echo "  3. Set GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
echo "  4. Set GCS_BUCKET=${BUCKET_NAME}"
echo "  5. Set GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json"
echo "  6. Run: npm run dev"
