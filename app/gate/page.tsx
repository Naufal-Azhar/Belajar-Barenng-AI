'use client';

import { useState } from 'react';
import { PixelBadge } from '@/components/Pixel';

export default function GatePage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError('Kode salah, coba lagi.');
        setLoading(false);
        return;
      }
      window.location.href = '/';
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 text-center">
      <PixelBadge>Akses Terbatas</PixelBadge>
      <h1 className="mt-5 font-serif font-bold text-display-sm text-ink">BelajarBareng AI</h1>
      <p className="mt-3 max-w-sm text-body-md text-muted">
        Masukkan kode akses untuk masuk.
      </p>
      <form onSubmit={submit} className="mt-7 flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Kode akses"
          autoFocus
          className="w-full rounded-2xl border border-hairline bg-surface-card px-4 py-3 text-center text-body-md text-ink outline-none focus:border-primary"
        />
        {error && <p className="text-body-sm text-error">{error}</p>}
        <button type="submit" disabled={loading || !code} className="btn-primary">
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
