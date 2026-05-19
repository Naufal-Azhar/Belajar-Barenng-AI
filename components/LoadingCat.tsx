'use client';

/**
 * LoadingCat — reusable loading indicator dengan animasi pixel kucing + caption.
 *
 * Variants:
 *   - 'bubble'  → kotak bubble dengan border + bg (default; mirip typing indicator).
 *   - 'inline'  → tanpa background/border, untuk dipakai di dalam card/zone existing.
 *   - 'button'  → kucing kecil (24px), untuk dipakai di dalam tombol.
 *
 * Caption: Edit langsung di call-site. Search keyword `EDIT CAPTION` di project
 *          untuk menemukan semua lokasi yang bisa diubah teksnya.
 */

interface Props {
  caption: string;
  variant?: 'bubble' | 'inline' | 'button';
  className?: string;
}

const VIDEO_SRC = '/loading-cat.webm';

export default function LoadingCat({
  caption,
  variant = 'bubble',
  className = '',
}: Props) {
  const isButton = variant === 'button';

  // Container styling per variant
  const containerClass = (() => {
    switch (variant) {
      case 'bubble':
        return 'inline-flex items-center gap-2 rounded-lg bg-surface-card border border-hairline px-4 py-3';
      case 'inline':
        return 'inline-flex items-center gap-2';
      case 'button':
        return 'inline-flex items-center gap-1.5';
    }
  })();

  // Video sizing per variant
  const videoSizeClass = isButton ? 'w-6 h-6' : 'w-9 h-9';

  // Caption typography per variant
  const captionClass = isButton
    ? 'text-sm font-sans'
    : 'text-body-sm text-muted';

  return (
    <div className={`${containerClass} ${className}`.trim()}>
      <video
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
        aria-label="Loading"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{
          imageRendering: 'pixelated',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
        className={`${videoSizeClass} object-contain shrink-0 select-none`}
      />
      {caption && <span className={captionClass}>{caption}</span>}
    </div>
  );
}
