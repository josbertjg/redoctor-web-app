import { z } from 'zod';

/*
 * Google Places, as the search's «¿Dónde?» uses it (M16): the places a
 * typed text names and the point of the one chosen. The web's server asks
 * Google's Place Autocomplete and Place Details web services — the same
 * the app calls, Venezuela only — and answers the browser in the web's
 * own shape; the key never leaves the server (AGENTS.md §11).
 */

/* ---------- What Google answers (the server parses it) ----------------- */

const googleStatus = z.string();

export const googleAutocompleteSchema = z.object({
  status: googleStatus,
  error_message: z.string().optional(),
  predictions: z
    .array(
      z.object({
        place_id: z.string(),
        description: z.string(),
        structured_formatting: z
          .object({
            main_text: z.string(),
            secondary_text: z.string().optional(),
          })
          .optional(),
      }),
    )
    .default([]),
});

export const googleDetailsSchema = z.object({
  status: googleStatus,
  error_message: z.string().optional(),
  result: z
    .object({
      name: z.string().optional(),
      formatted_address: z.string().optional(),
      geometry: z
        .object({
          location: z.object({ lat: z.number(), lng: z.number() }),
        })
        .optional(),
    })
    .optional(),
});

/* ---------- What the web answers (the browser parses it) --------------- */

export const placeSuggestionSchema = z.object({
  id: z.string(),
  /** «Caracas», «Av. Francisco de Miranda». */
  mainText: z.string(),
  /** «Distrito Capital, Venezuela». */
  secondaryText: z.string().nullable(),
});

export type PlaceSuggestion = z.output<typeof placeSuggestionSchema>;

export const placeSuggestionsResponseSchema = z.object({
  places: z.array(placeSuggestionSchema),
});

/** The point alone: the label is the suggestion's own name, known at the pick. */
export const placeDetailsResponseSchema = z.object({
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
});

export type PlaceDetails = z.output<typeof placeDetailsResponseSchema>;

/** Google's answer to a prediction, in the web's shape. */
export function toPlaceSuggestions(
  response: z.output<typeof googleAutocompleteSchema>,
): PlaceSuggestion[] {
  return response.predictions.map((prediction) => ({
    id: prediction.place_id,
    mainText:
      prediction.structured_formatting?.main_text ?? prediction.description,
    secondaryText: prediction.structured_formatting?.secondary_text ?? null,
  }));
}
