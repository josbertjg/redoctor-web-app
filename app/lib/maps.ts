/*
 * Directions open in Google Maps (the app's office directions do the same).
 * No browser key is needed: it is a plain link (AGENTS.md §11).
 */
export function directionsUrl(coordinates: {
  latitude: number;
  longitude: number;
}): string {
  const destination = `${coordinates.latitude},${coordinates.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
