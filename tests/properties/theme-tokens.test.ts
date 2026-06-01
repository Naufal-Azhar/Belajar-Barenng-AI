import { describe, it, expect } from 'vitest';
import config from '../../tailwind.config';

/**
 * Task 1 — fondasi tipografi & token desain.
 * Verifikasi: font playful-rounded ter-expose, dan palet warna TIDAK berubah.
 */
describe('Theme tokens (Task 1)', () => {
  const fonts = (config.theme?.extend?.fontFamily ?? {}) as Record<string, string[]>;
  const colors = (config.theme?.extend?.colors ?? {}) as Record<string, any>;

  it('heading font (serif slot) pakai Baloo 2', () => {
    expect(fonts.serif?.[0]).toBe('Baloo 2');
  });

  it('body font (sans slot) pakai Nunito', () => {
    expect(fonts.sans?.[0]).toBe('Nunito');
  });

  it('pertahankan aksen pixel (Silkscreen)', () => {
    expect(fonts.pixel?.[0]).toBe('Silkscreen');
  });

  it('palet warna dipertahankan (primary + accent tidak diubah)', () => {
    expect(colors.primary?.DEFAULT).toBe('#2A7E72');
    expect(colors.accent?.leaf).toBe('#4E8C46');
  });
});
