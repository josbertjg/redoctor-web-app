import {
  publicProfileResponseSchema,
  toSpecialistProfile,
  type myProfileResponseSchema,
  type SpecialistProfile,
} from '@/app/lib/schemas/specialists';

import type { z } from 'zod';

type PublicProfileInput = z.input<typeof publicProfileResponseSchema>;
type ProfileInput = PublicProfileInput['profile'];

export const knownSpecialistId = 'a0af9566-a53d-4887-8d16-1dfc589c2f3d';

/*
 * A public profile shaped like the API's (dev, 2026-10-07), with made-up
 * people and places.
 */
export function buildPublicProfileResponse(
  overrides: Partial<Omit<PublicProfileInput, 'profile'>> & {
    profile?: Partial<ProfileInput>;
  } = {},
): PublicProfileInput {
  const { profile, ...rest } = overrides;
  return {
    profile: {
      specialistId: knownSpecialistId,
      displayName: 'Ana Pérez',
      description:
        'Médica internista con diez años de experiencia en consulta privada.',
      experiencia: 'Hospital Universitario de Caracas, 2014–2024.',
      certificationList: [
        {
          name: 'Diplomado en Medicina Interna',
          institution: 'Universidad Central de Venezuela',
          year: 2016,
          type: 'DIPLOMA',
        },
      ],
      gallery: [
        {
          id: 'g2',
          url: 'https://firebasestorage.googleapis.com/v0/b/redoctor/o/b.jpg',
          altText: 'Sala de espera',
          sortOrder: 2,
        },
        {
          id: 'g1',
          url: 'https://firebasestorage.googleapis.com/v0/b/redoctor/o/a.jpg',
          altText: null,
          sortOrder: 1,
        },
      ],
      photoUrl: 'https://lh3.googleusercontent.com/a/photo=s96-c',
      ...profile,
    },
    verified: true,
    rating: { average: 4.5, count: 2 },
    specialties: [
      {
        specialtyName: 'Medicina Interna',
        specialtyPath: ['Medicina', 'Medicina Interna'],
        collegeName: 'Colegio de Médicos del Distrito Metropolitano',
        isVerified: true,
        subspecialties: [],
      },
      {
        specialtyName: 'Cardiología',
        specialtyPath: ['Medicina', 'Cardiología'],
        collegeName: 'Colegio de Médicos del Distrito Metropolitano',
        isVerified: false,
        subspecialties: [],
      },
    ],
    offices: [
      {
        id: '5d0f2c1e-7b0a-4b8e-9c55-2c7f3e8b1a10',
        name: 'Clínica El Ávila',
        address: 'Av. San Juan Bosco, Altamira, Caracas',
        description: 'Piso 6, consultorio 604',
        latitude: 10.4965,
        longitude: -66.8487,
        timezone: 'America/Caracas',
      },
    ],
    ...rest,
  };
}

type MyProfileInput = z.input<typeof myProfileResponseSchema>;
type OwnSpecialtyInput = MyProfileInput['specialties'][number];

/** A specialty as the specialist's own profile lists it: verified unless told otherwise. */
export function buildOwnSpecialty(
  overrides: Partial<OwnSpecialtyInput> = {},
): OwnSpecialtyInput {
  return {
    id: 'specialty-internal',
    specialtyName: 'Medicina Interna',
    specialtyPath: ['Medicina', 'Medicina Interna'],
    collegeName: 'Colegio de Médicos del Distrito Metropolitano',
    medicalLicenseNumber: '12345',
    verificationStatus: 'VERIFIED',
    rejectionReason: null,
    subspecialties: [],
    ...overrides,
  };
}

/*
 * The specialist's own profile shaped like `GET /specialists/profile` (dev,
 * 2026-10-13), with made-up people.
 */
export function buildMyProfileResponse(
  overrides: {
    profile?: Partial<MyProfileInput['profile']>;
    specialties?: OwnSpecialtyInput[];
  } = {},
): MyProfileInput {
  return {
    profile: {
      specialistId: knownSpecialistId,
      displayName: 'Dr. Luis Gómez',
      description: 'Internista con diez años de consulta privada en Caracas.',
      experiencia: 'Hospital Universitario de Caracas, 2014–2024.',
      certificationList: [
        {
          name: 'Diplomado en Medicina Interna',
          institution: 'Universidad Central de Venezuela',
          location: null,
          year: 2016,
          type: 'DIPLOMA',
        },
      ],
      gallery: [],
      photoUrl: null,
      ...overrides.profile,
    },
    specialties: overrides.specialties ?? [buildOwnSpecialty()],
  };
}

/** The DTO the UI receives, built through the real contract. */
export function buildSpecialistProfile(
  response: PublicProfileInput = buildPublicProfileResponse(),
): SpecialistProfile {
  return toSpecialistProfile(publicProfileResponseSchema.parse(response));
}
