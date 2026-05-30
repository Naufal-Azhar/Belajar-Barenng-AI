'use client';

/** Thin desktop-only toggle to collapse/expand a right-side rail so the chat can widen. */
export default function RailToggle({
  open,
  onToggle,
  label = 'panel',
}: {
  open: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={open ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
      className="hidden md:flex w-5 shrink-0 items-center justify-center self-stretch border-l border-hairline bg-surface-card/50 text-muted transition-colors hover:bg-surface-card hover:text-ink"
    >
      <span aria-hidden="true" className="text-sm leading-none">{open ? '›' : '‹'}</span>
    </button>
  );
}
