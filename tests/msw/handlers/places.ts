import { http, HttpResponse } from 'msw';

/*
 * Google Places, on both sides of the web's server:
 * - Google's Place Autocomplete and Place Details web services, as the
 *   server calls them: two cities for a text that starts «mara», nothing
 *   otherwise; a point for each of them;
 * - the web's own `/api/places/*`, which the browser calls (app/api/places):
 *   the same places, in the web's shape.
 */

export const placeIds = {
  maracaibo: 'ChIJ-maracaibo',
  maracay: 'ChIJ-maracay',
} as const;

const points: Record<string, { lat: number; lng: number }> = {
  [placeIds.maracaibo]: { lat: 10.6545, lng: -71.6372 },
  [placeIds.maracay]: { lat: 10.2477, lng: -67.5952 },
};

const predictions = [
  {
    place_id: placeIds.maracaibo,
    description: 'Maracaibo, Zulia, Venezuela',
    structured_formatting: {
      main_text: 'Maracaibo',
      secondary_text: 'Zulia, Venezuela',
    },
  },
  {
    place_id: placeIds.maracay,
    description: 'Maracay, Aragua, Venezuela',
    structured_formatting: {
      main_text: 'Maracay',
      secondary_text: 'Aragua, Venezuela',
    },
  },
];

const matches = (input: string | null) =>
  input?.toLocaleLowerCase('es').startsWith('mara') === true;

export const placesHandlers = [
  http.get(
    'https://maps.googleapis.com/maps/api/place/autocomplete/json',
    ({ request }) => {
      const params = new URL(request.url).searchParams;
      if (!params.has('key')) {
        return HttpResponse.json({
          status: 'REQUEST_DENIED',
          predictions: [],
          error_message: 'The provided API key is invalid.',
        });
      }
      return matches(params.get('input'))
        ? HttpResponse.json({ status: 'OK', predictions })
        : HttpResponse.json({ status: 'ZERO_RESULTS', predictions: [] });
    },
  ),
  http.get(
    'https://maps.googleapis.com/maps/api/place/details/json',
    ({ request }) => {
      const id = new URL(request.url).searchParams.get('place_id') ?? '';
      const location = points[id];
      return location
        ? HttpResponse.json({
            status: 'OK',
            result: { name: 'A place', geometry: { location } },
          })
        : HttpResponse.json({ status: 'NOT_FOUND' });
    },
  ),
  // The web's own, as the browser asks it (app/lib/queries/places.ts).
  http.get('*/api/places/suggestions', ({ request }) => {
    const input = new URL(request.url).searchParams.get('input');
    return HttpResponse.json({
      places: matches(input)
        ? predictions.map((prediction) => ({
            id: prediction.place_id,
            mainText: prediction.structured_formatting.main_text,
            secondaryText: prediction.structured_formatting.secondary_text,
          }))
        : [],
    });
  }),
  http.get('*/api/places/details', ({ request }) => {
    const id = new URL(request.url).searchParams.get('id') ?? '';
    const location = points[id];
    return location
      ? HttpResponse.json({
          coordinates: {
            lat: Math.round(location.lat * 100) / 100,
            lng: Math.round(location.lng * 100) / 100,
          },
        })
      : HttpResponse.json({ code: 'ERR_PLACE_NOT_FOUND' }, { status: 404 });
  }),
];
