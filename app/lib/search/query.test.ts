import { describe, expect, it } from 'vitest';

import {
  emptySearchQuery,
  hasCriteria,
  parseSearchQuery,
  searchQueryKey,
  toSearchParams,
  toSearchRequest,
  toSuggestionsRequest,
  type SearchQuery,
} from './query';

const today = '2026-10-14';
const specialtyId = 'a0000000-0000-4000-8000-000000000001';

describe('parseSearchQuery', () => {
  it('reads a whole address', () => {
    const query = parseSearchQuery(
      new URLSearchParams(
        `q=  cardio  logía &specialty=${specialtyId}&lat=10.4912&lng=-66.8799&near=Caracas&radius=60&from=2026-10-20`,
      ),
      today,
    );
    expect(query).toEqual({
      text: 'cardio logía',
      specialtyId,
      location: {
        kind: 'place',
        coordinates: { lat: 10.49, lng: -66.88 },
        label: 'Caracas',
      },
      radius: 60,
      from: '2026-10-20',
    });
  });

  it('reads the device and the map as points without a name', () => {
    expect(
      parseSearchQuery(
        { q: 'ana', lat: '10.49', lng: '-66.88', by: 'device' },
        today,
      ).location,
    ).toEqual({ kind: 'device', coordinates: { lat: 10.49, lng: -66.88 } });
    expect(
      parseSearchQuery({ q: 'ana', lat: '10.49', lng: '-66.88' }, today)
        .location,
    ).toEqual({ kind: 'area', coordinates: { lat: 10.49, lng: -66.88 } });
  });

  it('falls back to the whole country and the defaults on anything malformed', () => {
    const query = parseSearchQuery(
      {
        q: ['first', 'second'],
        specialty: 'not-a-uuid',
        lat: '91',
        lng: '-66.88',
        radius: '20',
        from: '2026-02-30',
      },
      today,
    );
    expect(query).toEqual({
      ...emptySearchQuery,
      text: 'first',
    });
  });

  it('keeps no radius for the whole country and no past day', () => {
    expect(
      parseSearchQuery({ q: 'ana', radius: '15', from: '2026-10-13' }, today),
    ).toEqual({ ...emptySearchQuery, text: 'ana' });
    expect(parseSearchQuery({ q: 'ana', from: today }, today).from).toBe(today);
  });

  it('refuses a text longer than the limit and an empty one', () => {
    expect(parseSearchQuery({ q: 'x'.repeat(101) }, today).text).toBeNull();
    expect(parseSearchQuery({ q: '   ' }, today).text).toBeNull();
  });

  it('reads an empty or unbounded coordinate as no point, never as 0', () => {
    for (const lat of ['', '  ', 'Infinity', 'NaN', '1e3']) {
      expect(
        parseSearchQuery({ q: 'ana', lat, lng: '-66.88' }, today).location,
      ).toEqual(emptySearchQuery.location);
    }
  });

  it('takes a catalog id in either case, and nothing else', () => {
    const upper = specialtyId.toUpperCase();
    expect(parseSearchQuery({ specialty: upper }, today).specialtyId).toBe(
      upper,
    );
    expect(
      parseSearchQuery({ specialty: `${specialtyId}x` }, today).specialtyId,
    ).toBeNull();
  });
});

describe('toSearchParams', () => {
  it('writes only what is not the default, and comes back the same', () => {
    const query: SearchQuery = {
      text: 'ana',
      specialtyId: null,
      location: {
        kind: 'device',
        coordinates: { lat: 10.491, lng: -66.879 },
      },
      radius: 15,
      from: '2026-10-20',
    };
    const params = toSearchParams(query);
    expect(params.toString()).toBe(
      'q=ana&lat=10.49&lng=-66.88&by=device&radius=15&from=2026-10-20',
    );
    expect(parseSearchQuery(params, today)).toEqual({
      ...query,
      location: { kind: 'device', coordinates: { lat: 10.49, lng: -66.88 } },
    });
  });

  it('writes nothing for an empty search over the whole country', () => {
    expect(toSearchParams(emptySearchQuery).toString()).toBe('');
    expect(searchQueryKey({ ...emptySearchQuery, specialtyId })).toBe(
      `specialty=${specialtyId}`,
    );
  });
});

describe('hasCriteria', () => {
  it('needs a text or a specialty', () => {
    expect(hasCriteria(emptySearchQuery)).toBe(false);
    expect(hasCriteria({ ...emptySearchQuery, text: 'ana' })).toBe(true);
    expect(hasCriteria({ ...emptySearchQuery, specialtyId })).toBe(true);
  });
});

describe('toSearchRequest', () => {
  it('asks the API for a page around the point, within the radius', () => {
    expect(
      toSearchRequest(
        {
          text: null,
          specialtyId,
          location: {
            kind: 'place',
            coordinates: { lat: 10.49, lng: -66.88 },
            label: 'Caracas',
          },
          radius: 60,
          from: '2026-10-20',
        },
        2,
      ),
    ).toEqual({
      specialtyId,
      lat: 10.49,
      lng: -66.88,
      radiusMeters: 60_000,
      fromDate: '2026-10-20',
      page: 2,
      limit: 10,
    });
  });

  it('searches the whole country from its middle with no radius', () => {
    expect(toSearchRequest({ ...emptySearchQuery, text: 'ana' }, 1)).toEqual({
      search: 'ana',
      lat: 7.9,
      lng: -66.1,
      page: 1,
      limit: 10,
    });
  });
});

describe('toSuggestionsRequest', () => {
  it('asks five specialists by name, wherever they are', () => {
    expect(
      toSuggestionsRequest('car', {
        kind: 'device',
        coordinates: { lat: 10.49, lng: -66.88 },
      }),
    ).toEqual({ name: 'car', lat: 10.49, lng: -66.88, page: 1, limit: 5 });
  });
});
