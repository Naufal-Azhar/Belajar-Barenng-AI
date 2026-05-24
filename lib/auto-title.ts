/**
 * Generate judul sesi otomatis dari first user message.
 * Aturan:
 * - Trim whitespace, ganti newline jadi spasi
 * - Ambil 40 karakter pertama
 * - Tambah '…' kalau terpotong
 * - Kalau message ternyata JSON quiz_answer (kontrol message bukan teks user),
 *   fallback ke "Sesi {tanggal}"
 *
 * Format pure function — mudah ditest.
 */
export const TITLE_MAX_LENGTH = 40;

export function generateAutoTitle(rawMessage: string, fallbackDate: Date = new Date()): string {
  const trimmed = rawMessage.trim();

  // Detect quiz_answer or any control JSON message
  if (trimmed.startsWith('{') && trimmed.includes('"kind"')) {
    return `Sesi ${formatDateID(fallbackDate)}`;
  }

  // Sanitize: replace newlines with spaces, collapse multiple spaces
  const sanitized = trimmed.replace(/\s+/g, ' ');

  if (sanitized.length === 0) {
    return `Sesi ${formatDateID(fallbackDate)}`;
  }

  if (sanitized.length <= TITLE_MAX_LENGTH) {
    return sanitized;
  }

  return sanitized.slice(0, TITLE_MAX_LENGTH).trimEnd() + '…';
}

function formatDateID(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}
