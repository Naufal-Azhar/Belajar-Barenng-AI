import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingScreen from '@/components/OnboardingScreen';

/**
 * Task 3 — OnboardingScreen redesign (Warm Focus + aksen pixel halus).
 * Verifikasi: headline + brand badge + CTA ter-render, dan klik CTA memanggil onStart.
 */
describe('OnboardingScreen (Task 3)', () => {
  it('render headline, brand badge, dan CTA', () => {
    render(<OnboardingScreen onStart={vi.fn().mockResolvedValue(undefined)} />);
    expect(screen.getByText(/Belajar lebih/i)).toBeInTheDocument();
    expect(screen.getByText('BelajarBareng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mulai Belajar/i })).toBeInTheDocument();
  });

  it('klik CTA memanggil onStart', () => {
    const onStart = vi.fn().mockResolvedValue(undefined);
    render(<OnboardingScreen onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /Mulai Belajar/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
