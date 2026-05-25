/**
 * Migration: hapus field `profileType` dari semua dokumen di collection `sessions`.
 *
 * Jalankan: npm run migrate:firestore
 * (Membutuhkan GOOGLE_APPLICATION_CREDENTIALS yang ter-set ke service account JSON
 *  dan GOOGLE_CLOUD_PROJECT env var.)
 *
 * Strategy:
 * - Stream semua doc di collection `sessions`
 * - Untuk doc yang punya field `profileType`, batch-update dengan FieldValue.delete()
 * - Commit batch per 500 ops (Firestore limit)
 * - Idempotent: doc tanpa `profileType` di-skip otomatis
 *
 * Mode: langsung apply (no dry-run gate) — sesuai keputusan user untuk hackathon mode.
 */
import { Firestore, FieldValue } from '@google-cloud/firestore';

const BATCH_LIMIT = 500;

async function main(): Promise<void> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    console.error('[migrate:firestore] GOOGLE_CLOUD_PROJECT env var harus di-set');
    process.exit(1);
  }

  const db = new Firestore({ projectId });
  console.log(`[migrate:firestore] Connected to project: ${projectId}`);

  const snapshot = await db.collection('sessions').get();
  console.log(`[migrate:firestore] Found ${snapshot.size} session docs`);

  let processed = 0;
  let migrated = 0;
  let errors = 0;

  let batch = db.batch();
  let batchCount = 0;

  async function commitBatch(): Promise<void> {
    if (batchCount === 0) return;
    try {
      await batch.commit();
    } catch (err) {
      errors++;
      console.error(
        `[migrate:firestore] Batch commit failed: ${(err as Error).message}`
      );
    }
    batch = db.batch();
    batchCount = 0;
  }

  for (const doc of snapshot.docs) {
    processed++;
    const data = doc.data();
    if (!('profileType' in data)) continue;

    batch.update(doc.ref, { profileType: FieldValue.delete() });
    batchCount++;
    migrated++;

    if (batchCount >= BATCH_LIMIT) {
      await commitBatch();
    }
  }

  // Commit sisa
  await commitBatch();

  console.log(
    `[migrate:firestore] Done. Processed: ${processed}, Migrated: ${migrated}, Errors: ${errors}`
  );

  // Cleanup: terminate Firestore client agar process exit
  await db.terminate();
}

main().catch((err) => {
  console.error('[migrate:firestore] Fatal error:', err);
  process.exit(1);
});
