import { describe, expect, it } from 'vitest';

import {
  distanceBetween,
  isInVenezuela,
  isSearchRadius,
  locationCoordinates,
  radiusCovering,
  radiusMeters,
  roundCoordinates,
  sameLocation,
  venezuelaCenter,
  wholeCountry,
} from './location';

describe('roundCoordinates', () => {
  it('keeps two decimals, about a kilometre', () => {
    expect(roundCoordinates({ lat: 10.49123, lng: -66.87988 })).toEqual({
      lat: 10.49,
      lng: -66.88,
    });
  });
});

describe('isInVenezuela', () => {
  it('tells Caracas from California', () => {
    expect(isInVenezuela({ lat: 10.49, lng: -66.88 })).toBe(true);
    expect(isInVenezuela({ lat: 37.42, lng: -122.08 })).toBe(false);
  });
});

describe('locationCoordinates', () => {
  it('searches the whole country from its middle', () => {
    expect(locationCoordinates(wholeCountry)).toEqual(venezuelaCenter);
    expect(
      locationCoordinates({
        kind: 'device',
        coordinates: { lat: 10.49, lng: -66.88 },
      }),
    ).toEqual({ lat: 10.49, lng: -66.88 });
  });
});

describe('sameLocation', () => {
  it('compares the kind, the point and a place’s name', () => {
    const caracas = { lat: 10.49, lng: -66.88 };
    expect(sameLocation(wholeCountry, { kind: 'country' })).toBe(true);
    expect(
      sameLocation(
        { kind: 'place', coordinates: caracas, label: 'Caracas' },
        { kind: 'place', coordinates: caracas, label: 'Caracas' },
      ),
    ).toBe(true);
    expect(
      sameLocation(
        { kind: 'place', coordinates: caracas, label: 'Caracas' },
        { kind: 'device', coordinates: caracas },
      ),
    ).toBe(false);
    expect(
      sameLocation(
        { kind: 'area', coordinates: caracas },
        { kind: 'area', coordinates: { lat: 10.5, lng: -66.88 } },
      ),
    ).toBe(false);
  });
});

describe('the radius', () => {
  it('knows the app’s stops and «Todo el país»', () => {
    expect(isSearchRadius(15)).toBe(true);
    expect(isSearchRadius('all')).toBe(true);
    expect(isSearchRadius(20)).toBe(false);
    expect(isSearchRadius('15')).toBe(false);
  });

  it('sends metres, or nothing for the whole country', () => {
    expect(radiusMeters(60)).toBe(60_000);
    expect(radiusMeters('all')).toBeUndefined();
  });

  it('picks the narrowest stop that covers a distance', () => {
    expect(radiusCovering(9_000)).toBe(15);
    expect(radiusCovering(15_000)).toBe(15);
    expect(radiusCovering(40_000)).toBe(60);
    expect(radiusCovering(299_999)).toBe(300);
    expect(radiusCovering(500_000)).toBe('all');
  });
});

describe('distanceBetween', () => {
  it('measures Caracas to Maracaibo at about 520 km', () => {
    const distance = distanceBetween(
      { lat: 10.49, lng: -66.88 },
      { lat: 10.65, lng: -71.64 },
    );
    expect(distance).toBeGreaterThan(515_000);
    expect(distance).toBeLessThan(525_000);
  });

  it('is zero between a point and itself', () => {
    expect(distanceBetween({ lat: 8, lng: -66 }, { lat: 8, lng: -66 })).toBe(0);
  });
});
