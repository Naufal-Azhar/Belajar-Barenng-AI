/**
 * Group sesi berdasarkan kategori tanggal relatif (untuk header section di sidebar).
 *
 * Kategori:
 * - "Hari ini": updatedAt pada hari yang sama dengan now
 * - "Kemarin": updatedAt H-1
 * - "7 hari lalu": 2-7 hari yang lalu
 * - "Bulan ini": > 7 hari tapi masih di bulan & tahun yang sama
 * - "Lebih lama": sisanya
 */
export type DateGroupKey =
  | 'Hari ini'
  | 'Kemarin'
  | '7 hari lalu'
  | 'Bulan ini'
  | 'Lebih lama';

export const DATE_GROUP_ORDER: DateGroupKey[] = [
  'Hari ini',
  'Kemarin',
  '7 hari lalu',
  'Bulan ini',
  'Lebih lama',
];

export function getDateGroup(updatedAt: string, now: Date = new Date()): DateGroupKey {
  const d = new Date(updatedAt);
  if (isNaN(d.getTime())) return 'Lebih lama';

  const startOfNow = startOfDay(now);
  const startOfDate = startOfDay(d);
  const diffDays = Math.floor((startOfNow.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays >= 2 && diffDays <= 7) return '7 hari lalu';
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
    return 'Bulan ini';
  }
  return 'Lebih lama';
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Group array sesi by date category. Returns ordered array of [groupName, sessions[]].
 * Group kosong di-skip otomatis.
 */
export function groupByDate<T extends { updatedAt: string }>(
  items: T[],
  now: Date = new Date(),
): Array<{ key: DateGroupKey; items: T[] }> {
  const groups = new Map<DateGroupKey, T[]>();
  for (const item of items) {
    const key = getDateGroup(item.updatedAt, now);
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }
  return DATE_GROUP_ORDER.filter((k) => groups.has(k)).map((k) => ({ key: k, items: groups.get(k)! }));
}
