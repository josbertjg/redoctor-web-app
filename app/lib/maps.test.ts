import { describe, expect, it } from 'vitest';

import { directionsUrl } from './maps';

describe('directionsUrl', () => {
  it('opens Google Maps directions to the coordinates', () => {
    expect(directionsUrl({ latitude: 10.4965, longitude: -66.8487 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=10.4965%2C-66.8487',
    );
  });
});
