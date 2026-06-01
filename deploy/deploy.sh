#!/bin/bash
# Deploy BelajarBareng AI ke Google Cloud Run
# Usage: ./deploy/deploy.sh <PROJECT_ID>
#
# Prerequisites: Run setup-gcp.sh first

set -e

PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION="asia-southeast2"
SERVICE_NAME="belajar-bareng-ai"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/app/${SERVICE_NAME}:latest"
SA_EMAIL="belajar-bareng-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
BUCKET="${PROJECT_ID}-uploads"

echo "🚀 Deploying BelajarBareng AI to Cloud Run..."
echo "   Project: ${PROJECT_ID}"
echo "   Region:  ${REGION}"
echo ""

# Build and push image
echo "📦 Building container image..."
gcloud builds submit --tag "${IMAGE}" --project "${PROJECT_ID}"

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 300s \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars "NODE_ENV=production,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GEMINI_MODEL=gemini-2.0-flash,GCS_BUCKET=${BUCKET}" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest,AUTH_SECRET=auth-secret:latest,ACCESS_CODE=access-code:latest" \
  --service-account "${SA_EMAIL}"

echo ""
echo "✅ Deployment complete!"
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" --format "value(status.url)"

echo ""
echo "💸 Catatan biaya (target < \$5/bulan):"
echo "   - min-instances 0 (scale-to-zero, idle = \$0), max-instances 1 (batasi lonjakan)."
echo "   - memory 512Mi/cpu 1. Firestore tetap free tier (1 GiB / 50K read / 20K write per hari)."
echo "   - Estimasi demo: ~\$0. WAJIB set Budget Alert \$5 di Cloud Billing sebagai pengaman."
echo ""
echo "🔐 Pastikan secret 'access-code' sudah dibuat (gerbang kode akses juri):"
echo "   echo -n 'KODE_JURI' | gcloud secrets create access-code --data-file=- --project ${PROJECT_ID}"
echo "   Bagikan URL + KODE_JURI ke juri lewat submission/slide."
