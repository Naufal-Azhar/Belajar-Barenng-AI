/**
 * Migration: hapus field `profileType` dari .dev-sessions.json
 *
 * Jalankan: npm run migrate:dev
 *
 * Idempotent: aman dijalankan ulang. Backup otomatis ke
 * .dev-sessions.backup.json sebelum write.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';

interface StoreData {
  sessions: Record<string, Record<string, unknown>>;
  messages: Record<string, unknown>;
}

const STORE_PATH = join(process.cwd(), '.dev-sessions.json');
const BACKUP_PATH = join(process.cwd(), '.dev-sessions.backup.json');

function main(): void {
  if (!existsSync(STORE_PATH)) {
    console.log(`[migrate:dev] No store file at ${STORE_PATH} — skipping.`);
    return;
  }

  // Backup first
  copyFileSync(STORE_PATH, BACKUP_PATH);
  console.log(`[migrate:dev] Backup saved to ${BACKUP_PATH}`);

  const raw = readFileSync(STORE_PATH, 'utf-8');
  let data: StoreData;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('[migrate:dev] Failed to parse JSON:', (err as Error).message);
    process.exit(1);
  }

  const sessionIds = Object.keys(data.sessions ?? {});
  let processed = 0;
  let migrated = 0;

  for (const id of sessionIds) {
    const session = data.sessions[id];
    processed++;
    if ('profileType' in session) {
      delete session.profileType;
      migrated++;
    }
  }

  writeFileSync(STORE_PATH, JSON.stringify(data, null, 0), 'utf-8');

  console.log(
    `[migrate:dev] Done. Processed: ${processed}, Migrated: ${migrated}, Errors: 0`
  );
}

main();
