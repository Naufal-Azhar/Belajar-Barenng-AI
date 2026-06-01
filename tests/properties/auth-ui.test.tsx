import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthModal from '@/components/AuthModal';
import AccountMenu from '@/components/AccountMenu';
import { AuthProvider } from '@/components/AuthProvider';

// /api/auth/me dipanggil saat mount AuthProvider → balas profile null (tamu).
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ profile: null }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  localStorage.clear();
});

describe('AuthModal (Task 10)', () => {
  it('switch tab Masuk → Daftar', () => {
    render(
      <AuthProvider>
        <AuthModal open onClose={() => {}} />
      </AuthProvider>,
    );
    // Default tab login → heading "Masuk"
    expect(screen.getByRole('heading', { name: 'Masuk' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }));
    expect(screen.getByRole('heading', { name: 'Buat profil' })).toBeInTheDocument();
  });

  it('tidak render saat open=false', () => {
    render(
      <AuthProvider>
        <AuthModal open={false} onClose={() => {}} />
      </AuthProvider>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('AccountMenu (Task 10)', () => {
  it('tampilkan tombol Masuk / Daftar saat tamu', () => {
    render(
      <AuthProvider>
        <AccountMenu />
      </AuthProvider>,
    );
    expect(screen.getByText(/Masuk \/ Daftar/i)).toBeInTheDocument();
  });
});
