/*
 * Google account photos (lh3.googleusercontent.com) carry their size in the
 * URL (`…=s96-c`): the sign-in default is 96 px, which looks soft in the
 * profile's 110 px avatar on a 3x screen. Ask Google for the size we draw.
 * Any other URL comes back untouched.
 */
const googleSizeSuffix = /=s\d+(-c)?$/;

export function sizedPhotoUrl(url: string, pixels: number): string {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return url;
  }
  if (!host.endsWith('.googleusercontent.com')) return url;
  return googleSizeSuffix.test(url)
    ? url.replace(googleSizeSuffix, `=s${String(pixels)}-c`)
    : url;
}
