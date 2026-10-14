import type { SearchLocation } from '@/app/lib/search/location';
import type { SuggestibleSpecialty } from '@/app/lib/search/suggestions';

/** A specialty of the catalog the box has in hand. */
export type SpecialtyRef = { id: string; name: string };

/** What the search box holds: the text or the specialty, and the place. */
export type SearchBarValue = {
  text: string;
  specialty: SpecialtyRef | null;
  location: SearchLocation;
};

/** The catalog, flat, as the box offers and matches it. */
export type SearchCatalog = readonly SuggestibleSpecialty[];

/** The look of the box: in the landing's hero, in its docked bar, on the search page. */
export type SearchBarVariant = 'hero' | 'bar' | 'page';

/**
 * Every word the box says, translated on the server and handed down
 * (`useSearchBarWords`): the box is a client component on pages that send
 * no search copy to the browser (the landing).
 */
export type SearchBarWords = {
  submit: string;
  /** «Busca por nombre o especialidad», and the one word of the docked bar. */
  whatHint: string;
  whatShortHint: string;
  whatLabel: string;
  whereLabel: string;
  whereHint: string;
  clear: string;
  suggestions: string;
  searchFor: string;
  recentSearches: string;
  topSpecialties: string;
  specialtiesGroup: string;
  specialistsGroup: string;
  placesGroup: string;
  noSuggestions: string;
  placesFailed: string;
  removeRecent: string;
  verifiedSpecialist: string;
  useMyLocation: string;
  locating: string;
  currentLocation: string;
  wholeCountry: string;
  mapArea: string;
  needCriteria: string;
  locationDenied: string;
  locationUnavailable: string;
};
