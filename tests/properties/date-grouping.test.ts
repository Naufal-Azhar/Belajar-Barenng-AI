import { describe, it, expect } from 'vitest';
import { getDateGroup, groupByDate } from '@/lib/date-grouping';

describe('getDateGroup', () => {
  const now = new Date('2026-05-23T15:00:00');

  it('returns "Hari ini" untuk sesi 2 jam lalu', () => {
    const earlier = new Date('2026-05-23T13:00:00').toISOString();
    expect(getDateGroup(earlier, now)).toBe('Hari ini');
  });

  it('returns "Kemarin" untuk sesi H-1', () => {
    const yesterday = new Date('2026-05-22T20:00:00').toISOString();
    expect(getDateGroup(yesterday, now)).toBe('Kemarin');
  });

  it('returns "7 hari lalu" untuk 3 hari lalu', () => {
    const threeDaysAgo = new Date('2026-05-20T10:00:00').toISOString();
    expect(getDateGroup(threeDaysAgo, now)).toBe('7 hari lalu');
  });

  it('returns "Bulan ini" untuk 14 hari lalu (sebulan sama)', () => {
    const twoWeeksAgo = new Date('2026-05-09T10:00:00').toISOString();
    expect(getDateGroup(twoWeeksAgo, now)).toBe('Bulan ini');
  });

  it('returns "Lebih lama" untuk bulan berbeda', () => {
    const lastMonth = new Date('2026-03-01T10:00:00').toISOString();
    expect(getDateGroup(lastMonth, now)).toBe('Lebih lama');
  });

  it('returns "Lebih lama" untuk invalid date', () => {
    expect(getDateGroup('not-a-date', now)).toBe('Lebih lama');
  });
});

describe('groupByDate', () => {
  const now = new Date('2026-05-23T15:00:00');

  it('groups items dan skip group kosong', () => {
    const items = [
      { id: 'a', updatedAt: new Date('2026-05-23T10:00:00').toISOString() },
      { id: 'b', updatedAt: new Date('2026-05-22T10:00:00').toISOString() },
      { id: 'c', updatedAt: new Date('2026-05-21T10:00:00').toISOString() },
    ];
    const groups = groupByDate(items, now);
    expect(groups).toHaveLength(3);
    expect(groups[0].key).toBe('Hari ini');
    expect(groups[1].key).toBe('Kemarin');
    expect(groups[2].key).toBe('7 hari lalu');
  });

  it('preserves urutan dalam group', () => {
    const items = [
      { id: '1', updatedAt: '2026-05-23T08:00:00' },
      { id: '2', updatedAt: '2026-05-23T14:00:00' },
    ];
    const groups = groupByDate(items, now);
    expect(groups[0].items.map((x) => x.id)).toEqual(['1', '2']);
  });

  it('returns array kosong untuk input kosong', () => {
    expect(groupByDate([], now)).toEqual([]);
  });
});
