import { describe, expect, it } from 'vitest';

import {
  buildMyProfileResponse,
  buildOwnSpecialty,
  buildPublicProfileResponse,
} from '@/tests/factories/specialists';

import {
  byReviewUrgency,
  myProfileResponseSchema,
  publicProfileResponseSchema,
  specialtiesReview,
  toMyProfile,
  toSpecialistProfile,
  visibleSpecialties,
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

describe('the specialist’s own profile', () => {
  const own = (overrides: Parameters<typeof buildMyProfileResponse>[0] = {}) =>
    toMyProfile(
      myProfileResponseSchema.parse(buildMyProfileResponse(overrides)),
    );

  const cardiology = buildOwnSpecialty({
    id: 'cardiology',
    specialtyName: 'Cardiología',
    specialtyPath: ['Medicina', 'Cardiología'],
  });
  const medicine = buildOwnSpecialty({
    id: 'medicine',
    specialtyName: 'Medicina',
    specialtyPath: ['Medicina'],
  });

  it('lists the specialties as the app does, the API’s order reversed', () => {
    const profile = own({ specialties: [cardiology, medicine] });

    expect(profile.specialties.map((specialty) => specialty.id)).toEqual([
      'medicine',
      'cardiology',
    ]);
  });

  it('reads a review status it does not know as unknown, never as verified', () => {
    const profile = own({
      specialties: [buildOwnSpecialty({ verificationStatus: 'ESCALATED' })],
    });

    expect(profile.specialties[0]?.review).toBe('unknown');
    expect(visibleSpecialties(profile.specialties)).toEqual([]);
    expect(specialtiesReview(profile.specialties)).toBe('underReview');
  });

  it('shows patients a verified branch without its verified parent', () => {
    const profile = own({ specialties: [cardiology, medicine] });

    expect(
      visibleSpecialties(profile.specialties).map((specialty) => specialty.id),
    ).toEqual(['cardiology']);
  });

  it('puts first what asks something of the specialist: rejected, then in review', () => {
    const profile = own({
      specialties: [
        buildOwnSpecialty({ id: 'verified' }),
        buildOwnSpecialty({ id: 'pending', verificationStatus: 'PENDING' }),
        buildOwnSpecialty({ id: 'rejected', verificationStatus: 'REJECTED' }),
      ],
    });

    expect(
      byReviewUrgency(profile.specialties).map((specialty) => specialty.id),
    ).toEqual(['rejected', 'pending', 'verified']);
  });

  it('tells where the review stands as a whole', () => {
    const review = (statuses: string[]) =>
      specialtiesReview(
        own({
          specialties: statuses.map((verificationStatus, index) =>
            buildOwnSpecialty({ id: String(index), verificationStatus }),
          ),
        }).specialties,
      );

    expect(review(['VERIFIED', 'REJECTED'])).toBe('verified');
    expect(review(['PENDING', 'REJECTED'])).toBe('underReview');
    expect(review(['REJECTED'])).toBe('rejected');
    expect(review([])).toBe('none');
  });

  it('takes the place a certification was taken at when it names no institution', () => {
    const profile = own({
      profile: {
        certificationList: [
          {
            name: 'Curso de ecografía',
            institution: ' ',
            location: 'Caracas',
            year: null,
            type: 'COURSE',
          },
        ],
      },
    });

    expect(profile.certifications[0]?.institution).toBe('Caracas');
  });
});
