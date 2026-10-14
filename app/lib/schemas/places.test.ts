import { describe, expect, it } from 'vitest';

import { googleAutocompleteSchema, toPlaceSuggestions } from './places';

describe('toPlaceSuggestions', () => {
  it('shapes Google’s predictions as the box reads them', () => {
    const answer = googleAutocompleteSchema.parse({
      status: 'OK',
      predictions: [
        {
          place_id: 'ChIJ-1',
          description: 'Caracas, Distrito Capital, Venezuela',
          structured_formatting: {
            main_text: 'Caracas',
            secondary_text: 'Distrito Capital, Venezuela',
          },
        },
        { place_id: 'ChIJ-2', description: 'Somewhere' },
      ],
    });
    expect(toPlaceSuggestions(answer)).toEqual([
      {
        id: 'ChIJ-1',
        mainText: 'Caracas',
        secondaryText: 'Distrito Capital, Venezuela',
      },
      { id: 'ChIJ-2', mainText: 'Somewhere', secondaryText: null },
    ]);
  });

  it('reads an answer with no predictions', () => {
    expect(
      googleAutocompleteSchema.parse({ status: 'ZERO_RESULTS' }).predictions,
    ).toEqual([]);
  });
});
