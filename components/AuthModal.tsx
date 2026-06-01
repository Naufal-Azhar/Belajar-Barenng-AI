'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from './AuthProvider';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'login' | 'register';

export default function AuthModal({ open, onClose }: Props) {
  const { login, register, recent } = useAuthContext();
  const [tab, setTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (tab === 'register') {
        await register(username.trim(), pin || undefined, username.trim());
      } else {
        await login(username.trim(), pin || undefined);
      }
      setUsername('');
      setPin('');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            role="dialog"
            aria-label="Masuk atau daftar"
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-canvas border border-hairline shadow-pop p-6"
          >
            <h2 className="font-serif font-bold text-title-lg text-ink mb-1">
              {tab === 'login' ? 'Masuk' : 'Buat profil'}
            </h2>
            <p className="text-body-sm text-muted mb-4">Cukup username — tanpa email. PIN opsional.</p>

            {/* Tabs */}
            <div className="mb-4 inline-flex gap-1 rounded-pill bg-surface-soft p-1">
              <button onClick={() => setTab('login')} className={tab === 'login' ? 'tab-active' : 'tab'}>Masuk</button>
              <button onClick={() => setTab('register')} className={tab === 'register' ? 'tab-active' : 'tab'}>Daftar</button>
            </div>

            {/* Recent accounts (login tab) */}
            {tab === 'login' && recent.length > 0 && (
              <div className="mb-4">
                <p className="text-caption-upper uppercase tracking-wider text-muted mb-2">Akun terakhir</p>
                <div className="flex flex-wrap gap-2">
                  {recent.map((a) => (
                    <button
                      key={a.username}
                      onClick={() => setUsername(a.username)}
                      className="rounded-pill border border-hairline bg-surface-soft px-3 py-1 text-caption font-semibold text-ink hover:border-primary transition-colors"
                    >
                      {a.displayName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                aria-label="Username"
                className="input w-full"
                autoFocus
              />
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={tab === 'register' ? 'PIN (opsional)' : 'PIN (jika ada)'}
                aria-label="PIN"
                type="password"
                inputMode="numeric"
                className="input w-full"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>

            {error && <p className="mt-3 text-body-sm text-error">{error}</p>}

            <button
              onClick={submit}
              disabled={busy || username.trim().length === 0}
              className="btn-primary w-full mt-4"
            >
              {busy ? '...' : tab === 'login' ? 'Masuk' : 'Daftar'}
            </button>

            <button
              onClick={onClose}
              className="mt-2 w-full text-center text-body-sm text-muted hover:text-ink transition-colors"
            >
              Lanjut sebagai tamu
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
