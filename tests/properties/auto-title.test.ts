import { describe, it, expect } from 'vitest';
import { generateAutoTitle, TITLE_MAX_LENGTH } from '@/lib/auto-title';

describe('generateAutoTitle', () => {
  it('mengambil pesan utuh kalau di bawah limit', () => {
    expect(generateAutoTitle('Tolong jelaskan fotosintesis')).toBe('Tolong jelaskan fotosintesis');
  });

  it('memotong ke 40 karakter dan tambahkan ellipsis', () => {
    const long = 'Tolong jelaskan tentang fotosintesis dan respirasi sel beserta contohnya';
    const result = generateAutoTitle(long);
    expect(result.length).toBeLessThanOrEqual(TITLE_MAX_LENGTH + 1); // +1 untuk '…'
    expect(result.endsWith('…')).toBe(true);
  });

  it('trim whitespace di awal/akhir', () => {
    expect(generateAutoTitle('   halo    ')).toBe('halo');
  });

  it('mengganti newline dengan spasi', () => {
    expect(generateAutoTitle('baris satu\nbaris dua')).toBe('baris satu baris dua');
  });

  it('collapse multiple spaces menjadi satu', () => {
    expect(generateAutoTitle('halo   dunia')).toBe('halo dunia');
  });

  it('fallback ke "Sesi {tanggal}" untuk quiz_answer JSON', () => {
    const fixedDate = new Date('2026-05-23T10:00:00Z');
    const result = generateAutoTitle('{"kind":"quiz_answer","answer":"A"}', fixedDate);
    expect(result).toMatch(/^Sesi \d+ \w+$/);
  });

  it('fallback untuk pesan kosong', () => {
    const result = generateAutoTitle('   ');
    expect(result).toMatch(/^Sesi /);
  });

  it('format tanggal Indonesia (Mei bukan May)', () => {
    const fixedDate = new Date('2026-05-23T10:00:00Z');
    const result = generateAutoTitle('   ', fixedDate);
    expect(result).toContain('Mei');
  });
});
