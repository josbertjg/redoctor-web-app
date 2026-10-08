import { z } from 'zod';

/*
 * `GET /specialists/{specialistId}/public-profile` (public, no session).
 * The schema is the contract with the API (AGENTS.md §3 rule 6): the server
 * fetcher, the MSW handlers and the factories all parse with it. The DTO is
 * what the UI receives: only what a public profile shows.
 */

/** Optional text that may come null or blank: both mean "not provided". */
const optionalText = z
  .string()
  .nullable()
  .transform((value) => {
    const trimmed = value?.trim() ?? '';
    return trimmed === '' ? null : trimmed;
  });

const certificationSchema = z.object({
  name: z.string(),
  institution: optionalText,
  year: z.number().nullable(),
  // Display only: an unknown new type must not break the page.
  type: z
    .enum(['DIPLOMA', 'COURSE', 'WORKSHOP', 'FELLOW'])
    .nullable()
    .catch(null),
});

const galleryImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  altText: optionalText,
  sortOrder: z.number(),
});

const specialtySchema = z.object({
  specialtyName: z.string(),
  specialtyPath: z.array(z.string()),
  collegeName: z.string(),
  isVerified: z.boolean(),
  subspecialties: z.array(z.string()),
});

const officeSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  description: optionalText,
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
});

export const publicProfileResponseSchema = z.object({
  profile: z.object({
    specialistId: z.string(),
    displayName: z.string(),
    description: optionalText,
    experiencia: optionalText,
    certificationList: z.array(certificationSchema),
    gallery: z.array(galleryImageSchema),
    photoUrl: z.string().nullable(),
  }),
  verified: z.boolean(),
  rating: z.object({
    average: z.number().nullable(),
    count: z.number().int(),
  }),
  specialties: z.array(specialtySchema),
  offices: z.array(officeSchema),
});

export type PublicProfileResponse = z.output<
  typeof publicProfileResponseSchema
>;

export type CertificationType = NonNullable<
  z.output<typeof certificationSchema>['type']
>;

export type SpecialistProfile = {
  id: string;
  name: string;
  photoUrl: string | null;
  description: string | null;
  experience: string | null;
  verified: boolean;
  rating: { average: number | null; count: number };
  /** Only the specialties the team verified (AGENTS.md M8). */
  specialties: {
    name: string;
    path: string[];
    college: string;
    subspecialties: string[];
  }[];
  offices: {
    id: string;
    name: string;
    address: string;
    description: string | null;
    coordinates: { latitude: number; longitude: number };
  }[];
  certifications: {
    name: string;
    institution: string | null;
    year: number | null;
    type: CertificationType | null;
  }[];
  gallery: { url: string; alt: string | null }[];
};

export function toSpecialistProfile(
  response: PublicProfileResponse,
): SpecialistProfile {
  const { profile } = response;
  return {
    id: profile.specialistId,
    name: profile.displayName.trim(),
    photoUrl: profile.photoUrl,
    description: profile.description,
    experience: profile.experiencia,
    verified: response.verified,
    rating: response.rating,
    specialties: response.specialties
      .filter((specialty) => specialty.isVerified)
      .map((specialty) => ({
        name: specialty.specialtyName,
        path: specialty.specialtyPath,
        college: specialty.collegeName,
        subspecialties: specialty.subspecialties,
      })),
    offices: response.offices.map((office) => ({
      id: office.id,
      name: office.name,
      address: office.address,
      description: office.description,
      coordinates: { latitude: office.latitude, longitude: office.longitude },
    })),
    certifications: profile.certificationList.map((certification) => ({
      name: certification.name,
      institution: certification.institution,
      year: certification.year,
      type: certification.type,
    })),
    gallery: [...profile.gallery]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({ url: image.url, alt: image.altText })),
  };
}
