import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PixelFrame, PixelBadge, PixelDivider } from '@/components/Pixel';

/**
 * Task 2 — primitif aksen pixel reusable.
 * Verifikasi: children ter-render + struktur dekoratif sesuai (4 corner, divider).
 */
describe('Pixel primitives (Task 2)', () => {
  it('PixelFrame render children + 4 corner pixel', () => {
    const { container } = render(
      <PixelFrame>
        <span>isi</span>
      </PixelFrame>,
    );
    expect(screen.getByText('isi')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-pixel-corner]')).toHaveLength(4);
  });

  it('PixelBadge render children dengan font pixel', () => {
    render(<PixelBadge>Beta</PixelBadge>);
    const badge = screen.getByText('Beta');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('font-pixel');
  });

  it('PixelDivider render elemen dekoratif (aria-hidden)', () => {
    const { container } = render(<PixelDivider />);
    expect(container.querySelector('[data-pixel-divider]')).toBeTruthy();
  });
});
