'use client';

import { useState } from 'react';
import { useAuthContext } from './AuthProvider';
import AuthModal from './AuthModal';

/** Menu akun untuk Sidebar loginSlot / header. Self-contained (render AuthModal sendiri). */
export default function AccountMenu() {
  const { profile, isAuthed, logout } = useAuthContext();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isAuthed) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-pill bg-primary px-3 py-2 text-caption font-bold text-on-primary shadow-soft hover:bg-primary-active active:scale-95 transition-all"
        >
          <span aria-hidden>👤</span> Masuk / Daftar
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  const initial = (profile?.displayName || profile?.username || '?').charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-pill border border-hairline bg-surface-soft px-2 py-1.5 hover:bg-surface-card transition-colors"
        aria-label="Menu akun"
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-primary text-on-primary text-caption font-bold">
          {initial}
        </span>
        <span className="truncate text-caption font-bold text-ink flex-1 text-left">
          {profile?.displayName}
        </span>
        <span aria-hidden className="text-muted">⋯</span>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute bottom-12 left-0 z-50 w-full rounded-xl border border-hairline bg-canvas shadow-pop py-1">
            <button
              onClick={() => { setMenuOpen(false); setAuthOpen(true); }}
              className="w-full text-left px-3 py-2 text-caption font-semibold text-ink hover:bg-surface-soft transition-colors"
            >
              🔄 Ganti akun
            </button>
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="w-full text-left px-3 py-2 text-caption font-semibold text-error hover:bg-error/10 transition-colors"
            >
              ↩ Keluar
            </button>
          </div>
        </>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
