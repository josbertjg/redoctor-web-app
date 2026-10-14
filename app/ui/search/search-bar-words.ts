import { useTranslations } from 'next-intl';

import type { SearchBarWords } from './search-bar-types';

/**
 * The search box's words, read where the catalog is (a server component,
 * or a test's provider) and handed to the box. The app's keys where the
 * app has the words (`search.*`, `location`, `geoLocation.*`), the web's
 * own under `search.web`.
 */
export function useSearchBarWords(): SearchBarWords {
  const t = useTranslations();
  return {
    submit: t('search.web.submit'),
    whatHint: t('search.searchHint'),
    whatShortHint: t('search.web.shortHint'),
    whatLabel: t('search.web.whatLabel'),
    whereLabel: t('location'),
    whereHint: t('search.web.whereHint'),
    clear: t('search.web.clear'),
    suggestions: t('search.web.suggestions'),
    searchFor: t('search.web.submit'),
    recentSearches: t('search.recentSearches'),
    topSpecialties: t('search.topSpecialties'),
    specialtiesGroup: t('search.web.specialtiesGroup'),
    specialistsGroup: t('search.web.specialistsGroup'),
    placesGroup: t('search.web.placesGroup'),
    noSuggestions: t('search.noSuggestions'),
    placesFailed: t('search.web.placesFailed'),
    removeRecent: t('search.web.removeRecent'),
    verifiedSpecialist: t('search.verifiedSpecialist'),
    useMyLocation: t('search.web.useMyLocation'),
    locating: t('search.web.locating'),
    currentLocation: t('currentLocation'),
    wholeCountry: t('search.web.wholeCountry'),
    mapArea: t('search.web.mapArea'),
    needCriteria: t('search.validation.criteria'),
    locationDenied: t('geoLocation.issue.permissionDenied'),
    locationUnavailable: t('geoLocation.issue.unavailable'),
  };
}
