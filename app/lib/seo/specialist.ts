import { sizedPhotoUrl } from '../photos';
import { isInVenezuela } from '../search/location';

import type { JsonLd, JsonLdValue } from './json-ld';
import type { SpecialistProfile } from '../schemas/specialists';

/*
 * A public profile (M8) as search engines read it: schema.org's `Physician`
 * — or `Dentist` when the specialty hangs from the catalog's dental root —,
 * with what the page already shows and nothing more: the name, the photos,
 * the description, the verified specialties, the offices as addresses with
 * their coordinates and the rating as a whole. No review, no patient, no
 * phone: the profile publishes none.
 */

type Office = SpecialistProfile['offices'][number];

/** The size the profile's hero draws the portrait at (4x the 110 px avatar). */
const PORTRAIT_PIXELS = 440;

const dentalRoot = /odont/i;

function postalAddress(office: Office): JsonLdValue {
  const { latitude: lat, longitude: lng } = office.coordinates;
  return {
    '@type': 'PostalAddress',
    streetAddress: office.address,
    // The address is free text; the country is said only where it is certain.
    ...(isInVenezuela({ lat, lng }) ? { addressCountry: 'VE' } : {}),
  };
}

function geoCoordinates(office: Office): JsonLdValue {
  return {
    '@type': 'GeoCoordinates',
    latitude: office.coordinates.latitude,
    longitude: office.coordinates.longitude,
  };
}

function clinic(office: Office): JsonLdValue {
  return {
    '@type': 'MedicalClinic',
    name: office.name,
    address: postalAddress(office),
    geo: geoCoordinates(office),
  };
}

export function specialistJsonLd(
  profile: SpecialistProfile,
  url: string,
): JsonLd {
  const [firstSpecialty] = profile.specialties;
  const [firstOffice] = profile.offices;
  const images = [
    ...(profile.photoUrl
      ? [sizedPhotoUrl(profile.photoUrl, PORTRAIT_PIXELS)]
      : []),
    ...profile.gallery.map((image) => image.url),
  ];
  const specialties = profile.specialties.map((specialty) => specialty.name);
  const { average, count } = profile.rating;

  return {
    '@context': 'https://schema.org',
    '@type': dentalRoot.test(firstSpecialty?.path[0] ?? '')
      ? 'Dentist'
      : 'Physician',
    '@id': url,
    url,
    name: profile.name,
    ...(images.length > 0 ? { image: images } : {}),
    ...(profile.description ? { description: profile.description } : {}),
    ...(specialties.length > 0 ? { medicalSpecialty: specialties } : {}),
    ...(firstOffice
      ? {
          address: postalAddress(firstOffice),
          geo: geoCoordinates(firstOffice),
        }
      : {}),
    ...(profile.offices.length > 1
      ? { location: profile.offices.map(clinic) }
      : {}),
    ...(count > 0 && average !== null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: average,
            reviewCount: count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}
