import 'server-only';

/*
 * A remote picture (a specialist's photo) embedded in a generated image
 * (next/og). The renderer only draws PNG and JPEG, and a slow or huge file
 * must never take the preview down: anything else yields null and the card
 * draws initials instead.
 */

const DRAWABLE_TYPES = new Set(['image/png', 'image/jpeg']);
const TIMEOUT_MS = 3000;
const MAX_BYTES = 2_000_000;
/** Photos change rarely; the preview can lag a day behind. */
const REVALIDATE_SECONDS = 86_400;

export async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    const type = response.headers.get('content-type')?.split(';')[0]?.trim();
    if (!response.ok || type === undefined || !DRAWABLE_TYPES.has(type)) {
      return null;
    }
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > MAX_BYTES) return null;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) return null;
    return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
  } catch {
    return null;
  }
}
