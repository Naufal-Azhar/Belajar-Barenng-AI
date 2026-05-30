import clsx from 'clsx';

const CORNERS = ['top-0 left-0', 'top-0 right-0', 'bottom-0 right-0', 'bottom-0 left-0'];

/** Wraps content and pins small square "pixels" at each corner — a subtle pixel-art frame. */
export function PixelFrame({
  children,
  className,
  cornerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  cornerClassName?: string;
}) {
  return (
    <div className={clsx('relative', className)}>
      {children}
      {CORNERS.map((pos) => (
        <span
          key={pos}
          data-pixel-corner
          aria-hidden="true"
          className={clsx('pointer-events-none absolute h-1.5 w-1.5 bg-accent-amber', pos, cornerClassName)}
        />
      ))}
    </div>
  );
}

/** Tiny squared label in the pixel font — for decorative tags/eyebrows. */
export function PixelBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 border border-hairline bg-surface-card px-2 py-1 font-pixel text-[10px] uppercase tracking-wider text-ink',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Dashed pixel rule; color follows currentColor (e.g. set text-hairline / text-accent-amber). */
export function PixelDivider({ className }: { className?: string }) {
  return (
    <div
      data-pixel-divider
      aria-hidden="true"
      className={clsx('h-[3px] w-full text-hairline', className)}
      style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px)' }}
    />
  );
}
