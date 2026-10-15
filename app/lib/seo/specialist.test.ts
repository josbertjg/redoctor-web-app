import { describe, expect, it } from 'vitest';

import {
  buildPublicProfileResponse,
  buildSpecialistProfile,
} from '@/tests/factories/specialists';

import { specialistJsonLd } from './specialist';

const url = 'https://redoctorapp.com/s/a0af9566-a53d-4887-8d16-1dfc589c2f3d';

describe('specialistJsonLd', () => {
  it('describes the profile as a physician with what the page shows', () => {
    const data = specialistJsonLd(buildSpecialistProfile(), url);

    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Physician',
      '@id': url,
      url,
      name: 'Ana Pérez',
      image: [
        'https://lh3.googleusercontent.com/a/photo=s440-c',
        'https://firebasestorage.googleapis.com/v0/b/redoctor/o/a.jpg',
        'https://firebasestorage.googleapis.com/v0/b/redoctor/o/b.jpg',
      ],
      description:
        'Médica internista con diez años de experiencia en consulta privada.',
      // Only the verified specialties: «Cardiología» is still in review.
      medicalSpecialty: ['Medicina Interna'],
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Av. San Juan Bosco, Altamira, Caracas',
        addressCountry: 'VE',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 10.4965,
        longitude: -66.8487,
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: 4.5,
        reviewCount: 2,
        bestRating: 5,
        worstRating: 1,
      },
    });
  });

  it('lists every office when there are several, and says no country for one abroad', () => {
    const profile = buildSpecialistProfile(
      buildPublicProfileResponse({
        offices: [
          {
            id: 'o1',
            name: 'Clínica El Ávila',
            address: 'Av. San Juan Bosco, Altamira, Caracas',
            description: null,
            latitude: 10.4965,
            longitude: -66.8487,
            timezone: 'America/Caracas',
          },
          {
            id: 'o2',
            name: 'Clinica Canaima',
            address: '1600 Amphitheatre Pkwy, Mountain View, CA',
            description: null,
            latitude: 37.4220541,
            longitude: -122.0853242,
            timezone: 'America/Caracas',
          },
        ],
      }),
    );

    const data = specialistJsonLd(profile, url);

    expect(data.address).toMatchObject({ addressCountry: 'VE' });
    expect(data.location).toEqual([
      {
        '@type': 'MedicalClinic',
        name: 'Clínica El Ávila',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Av. San Juan Bosco, Altamira, Caracas',
          addressCountry: 'VE',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 10.4965,
          longitude: -66.8487,
        },
      },
      {
        '@type': 'MedicalClinic',
        name: 'Clinica Canaima',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '1600 Amphitheatre Pkwy, Mountain View, CA',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 37.4220541,
          longitude: -122.0853242,
        },
      },
    ]);
  });

  it('leaves out what the profile lacks', () => {
    const profile = buildSpecialistProfile(
      buildPublicProfileResponse({
        profile: { photoUrl: null, description: null, gallery: [] },
        rating: { average: null, count: 0 },
        specialties: [],
        offices: [],
      }),
    );

    const data = specialistJsonLd(profile, url);

    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Physician',
      '@id': url,
      url,
      name: 'Ana Pérez',
    });
  });

  it('is a dentist when the specialty hangs from the dental root', () => {
    const profile = buildSpecialistProfile(
      buildPublicProfileResponse({
        specialties: [
          {
            specialtyName: 'Ortodoncia',
            specialtyPath: ['Odontología', 'Ortodoncia'],
            collegeName: 'Colegio de Odontólogos de Venezuela',
            isVerified: true,
            subspecialties: [],
          },
        ],
      }),
    );

    expect(specialistJsonLd(profile, url)).toMatchObject({
      '@type': 'Dentist',
      medicalSpecialty: ['Ortodoncia'],
    });
  });
});
