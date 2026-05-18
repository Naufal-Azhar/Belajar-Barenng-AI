#!/bin/bash
# Deploy BelajarBareng AI ke Google Cloud Run
# Usage: ./deploy/deploy.sh <PROJECT_ID>

set -e

PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION="asia-southeast2"
SERVICE_NAME="belajar-bareng-ai"
IMAGE="asia-southeast2-docker.pkg.dev/${PROJECT_ID}/app/${SERVICE_NAME}:latest"

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
  --memory 1Gi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 300s \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars "NODE_ENV=production,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GEMINI_MODEL=gemini-1.5-flash" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --service-account "belajar-bareng-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

echo ""
echo "✅ Deployment complete!"
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" --format "value(status.url)"
