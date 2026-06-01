'use client';

import { PixelBadge } from './Pixel';

export default function CapacityFull() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 text-center">
      <PixelBadge>Ruang Penuh</PixelBadge>
      <h1 className="mt-5 font-serif font-bold text-display-sm text-ink">
        Kapasitas penuh
      </h1>
      <p className="mt-3 max-w-sm text-body-md text-muted">
        Lagi banyak yang belajar bareng sekarang. Coba lagi beberapa menit lagi ya 🙏
      </p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-7">
        Coba Lagi
      </button>
    </div>
  );
}
