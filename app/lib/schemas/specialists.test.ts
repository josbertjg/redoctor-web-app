import { describe, expect, it } from 'vitest';

import { buildPublicProfileResponse } from '@/tests/factories/specialists';

import {
  publicProfileResponseSchema,
  toSpecialistProfile,
} from './specialists';

const profileOf = (response: unknown) =>
  toSpecialistProfile(publicProfileResponseSchema.parse(response));

describe('toSpecialistProfile', () => {
  it('shows only the specialties the team verified', () => {
    const profile = profileOf(buildPublicProfileResponse());

    expect(profile.specialties.map((specialty) => specialty.name)).toEqual([
      'Medicina Interna',
    ]);
  });

  it('orders the gallery as the specialist did', () => {
    const profile = profileOf(buildPublicProfileResponse());

    expect(profile.gallery).toEqual([
      {
        url: 'https://firebasestorage.googleapis.com/v0/b/redoctor/o/a.jpg',
        alt: null,
      },
      {
        url: 'https://firebasestorage.googleapis.com/v0/b/redoctor/o/b.jpg',
        alt: 'Sala de espera',
      },
    ]);
  });

  it('treats blank optional text as missing', () => {
    const profile = profileOf(
      buildPublicProfileResponse({
        profile: {
          displayName: '  Ana Pérez ',
          description: '   ',
          experiencia: null,
        },
      }),
    );

    expect(profile.name).toBe('Ana Pérez');
    expect(profile.description).toBeNull();
    expect(profile.experience).toBeNull();
  });

  it('survives a certification type it does not know yet', () => {
    const response = buildPublicProfileResponse();
    // Outside the contract's types on purpose: a type the API adds tomorrow.
    const profile = profileOf({
      ...response,
      profile: {
        ...response.profile,
        certificationList: [
          { name: 'Curso', institution: '', year: null, type: 'MASTERCLASS' },
        ],
      },
    });

    expect(profile.certifications).toEqual([
      { name: 'Curso', institution: null, year: null, type: null },
    ]);
  });

  it('keeps each office with its coordinates for directions', () => {
    const [office] = profileOf(buildPublicProfileResponse()).offices;

    expect(office).toMatchObject({
      name: 'Clínica El Ávila',
      coordinates: { latitude: 10.4965, longitude: -66.8487 },
    });
  });

  it('rejects a body that breaks the contract', () => {
    const { rating: _rating, ...withoutRating } = buildPublicProfileResponse();

    expect(publicProfileResponseSchema.safeParse(withoutRating).success).toBe(
      false,
    );
  });
});
