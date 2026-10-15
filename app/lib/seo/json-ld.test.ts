import { describe, expect, it } from 'vitest';

import { serializeJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('writes the document as JSON', () => {
    const json = serializeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Physician',
      name: 'Ana Pérez',
      image: ['https://example.com/a.jpg'],
      aggregateRating: { '@type': 'AggregateRating', ratingValue: 4.5 },
      description: undefined,
    });

    expect(JSON.parse(json)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Physician',
      name: 'Ana Pérez',
      image: ['https://example.com/a.jpg'],
      aggregateRating: { '@type': 'AggregateRating', ratingValue: 4.5 },
    });
  });

  it('keeps a text a person typed from closing the script', () => {
    const json = serializeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Physician',
      name: 'Dr. </script><script>alert(1)</script>',
      description: 'A & B   C',
    });

    expect(json).not.toContain('<');
    expect(json).not.toContain('>');
    expect(json).not.toContain('&');
    expect(json).not.toContain(' ');
    expect(JSON.parse(json)).toMatchObject({
      name: 'Dr. </script><script>alert(1)</script>',
      description: 'A & B   C',
    });
  });
});
