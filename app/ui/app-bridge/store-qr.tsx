import { encode } from 'uqr';

import { cn } from '@/app/lib/utils';

type StoreQrProps = {
  url: string;
  /** What it opens, for whoever cannot see it. */
  label: string;
  className?: string;
};

/*
 * A QR code for a store listing, drawn on the server as one SVG path (no
 * script, no image request): on a computer, the phone's camera takes the
 * person straight to the app's page in its store.
 */
export function StoreQr({ url, label, className }: StoreQrProps) {
  const { data, size } = encode(url, { border: 2 });
  const path = data
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${String(x)} ${String(y)}h1v1h-1z` : '')),
    )
    .join('');

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      shapeRendering="crispEdges"
      className={cn(
        'size-40 rounded-lg bg-pure-white text-pure-black',
        className,
      )}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
