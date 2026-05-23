import { Storage } from '@google-cloud/storage';

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (!_storage) {
    _storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT || 'local-dev' });
  }
  return _storage;
}

/**
 * Upload file to GCS. Returns gs:// URI or null if GCS is not configured.
 */
export async function uploadFile(
  sessionId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string | null> {
  const bucket = process.env.GCS_BUCKET;
  if (!bucket || process.env.USE_MEMORY_STORE === 'true') return null;

  const path = `uploads/${sessionId}/${fileName}`;
  const file = getStorage().bucket(bucket).file(path);
  await file.save(buffer, { contentType: mimeType, resumable: false });
  return `gs://${bucket}/${path}`;
}
