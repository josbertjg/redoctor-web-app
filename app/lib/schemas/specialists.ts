import { z } from 'zod';

/*
 * `GET /specialists/{specialistId}/public-profile` (public, no session).
 * The schema is the contract with the API (AGENTS.md §3 rule 6): the server
 * fetcher, the MSW handlers and the factories all parse with it. The DTO is
 * what the UI receives: only what a public profile shows.
 */

/** Optional text that may come null, blank or not at all: each means "not provided". */
const optionalText = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim() ?? '';
    return trimmed === '' ? null : trimmed;
  });

const certificationSchema = z.object({
  name: z.string(),
  institution: optionalText,
  /** Where it was taken: the issuer shown when there is no institution, as in the app. */
  location: optionalText,
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
    certifications: toCertifications(profile.certificationList),
    gallery: toGallery(profile.gallery),
  };
}

function toCertifications(
  list: readonly z.output<typeof certificationSchema>[],
): SpecialistProfile['certifications'] {
  return list.map((certification) => ({
    name: certification.name,
    institution: certification.institution ?? certification.location,
    year: certification.year,
    type: certification.type,
  }));
}

function toGallery(
  images: readonly z.output<typeof galleryImageSchema>[],
): SpecialistProfile['gallery'] {
  return [...images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => ({ url: image.url, alt: image.altText }));
}

/* ---------- The specialist's own profile ---------------------------------- */

/*
 * `GET /specialists/profile` (the specialist's session): the profile as the
 * API keeps it, with every specialty the specialist registered and where
 * its review stands, where the public profile shows only the verified ones.
 * «Mi perfil» and «Mis especialidades» read it on the panel; it is edited in
 * the app only.
 */

const ownSpecialtySchema = z.object({
  id: z.string(),
  specialtyName: z.string(),
  specialtyPath: z.array(z.string()),
  collegeName: z.string(),
  medicalLicenseNumber: z.string(),
  /** Free text in the contract; the catalog lives in `toSpecialtyReview`. */
  verificationStatus: z.string(),
  rejectionReason: optionalText,
  subspecialties: z.array(z.string()).catch([]),
});

export const myProfileResponseSchema = z.object({
  profile: z.object({
    specialistId: z.string(),
    displayName: optionalText,
    description: optionalText,
    experiencia: optionalText,
    certificationList: z.array(certificationSchema),
    gallery: z.array(galleryImageSchema),
    photoUrl: optionalText,
  }),
  specialties: z.array(ownSpecialtySchema),
});

export type MyProfileResponse = z.output<typeof myProfileResponseSchema>;

/** Where a specialty's review stands (the app's verification status). */
export type SpecialtyReview = 'verified' | 'pending' | 'rejected' | 'unknown';

const specialtyReviews: Readonly<Record<string, SpecialtyReview>> = {
  VERIFIED: 'verified',
  PENDING: 'pending',
  REJECTED: 'rejected',
};

export function toSpecialtyReview(raw: string): SpecialtyReview {
  return specialtyReviews[raw.toUpperCase()] ?? 'unknown';
}

export type MySpecialty = {
  id: string;
  name: string;
  /** From the root of the catalog to the specialty itself. */
  path: string[];
  college: string;
  license: string;
  review: SpecialtyReview;
  rejectionReason: string | null;
  subspecialties: string[];
};

export type MyProfile = {
  id: string;
  name: string | null;
  photoUrl: string | null;
  description: string | null;
  experience: string | null;
  certifications: SpecialistProfile['certifications'];
  gallery: SpecialistProfile['gallery'];
  /** As the app lists them: the API's order reversed, a parent before its branches. */
  specialties: MySpecialty[];
};

export function toMyProfile(response: MyProfileResponse): MyProfile {
  const { profile } = response;
  return {
    id: profile.specialistId,
    name: profile.displayName,
    photoUrl: profile.photoUrl,
    description: profile.description,
    experience: profile.experiencia,
    certifications: toCertifications(profile.certificationList),
    gallery: toGallery(profile.gallery),
    specialties: [...response.specialties].reverse().map((specialty) => ({
      id: specialty.id,
      name: specialty.specialtyName,
      path: specialty.specialtyPath,
      college: specialty.collegeName,
      license: specialty.medicalLicenseNumber,
      review: toSpecialtyReview(specialty.verificationStatus),
      rejectionReason: specialty.rejectionReason,
      subspecialties: specialty.subspecialties,
    })),
  };
}

/** A status this version does not know reads as still in review, as the app shows it. */
const isPending = (specialty: MySpecialty) =>
  specialty.review === 'pending' || specialty.review === 'unknown';

const urgency: Readonly<Record<SpecialtyReview, number>> = {
  rejected: 0,
  pending: 1,
  verified: 2,
  unknown: 3,
};

/**
 * «Mis especialidades» in the app's order: what asks something of the
 * specialist first — the rejected, then those in review, then the verified
 * —, each group in its own order.
 */
export function byReviewUrgency(
  specialties: readonly MySpecialty[],
): MySpecialty[] {
  return [...specialties].sort((a, b) => urgency[a.review] - urgency[b.review]);
}

const isBranchOf = (branch: MySpecialty, parent: MySpecialty) =>
  branch.path.length > parent.path.length &&
  parent.path.every((segment, index) => branch.path[index] === segment);

/**
 * What patients see of the specialties: the verified ones, without a parent
 * whose branch is verified too («Cardiología» says «Medicina» already), as
 * the app's profile shows them.
 */
export function visibleSpecialties(
  specialties: readonly MySpecialty[],
): MySpecialty[] {
  const verified = specialties.filter(
    (specialty) => specialty.review === 'verified',
  );
  return verified.filter(
    (parent) => !verified.some((branch) => isBranchOf(branch, parent)),
  );
}

/** Where the review of the specialties stands as a whole (the app's `specialtiesReviewStatus`). */
export type SpecialtiesReview =
  'verified' | 'underReview' | 'rejected' | 'none';

export function specialtiesReview(
  specialties: readonly MySpecialty[],
): SpecialtiesReview {
  if (visibleSpecialties(specialties).length > 0) return 'verified';
  if (specialties.some(isPending)) return 'underReview';
  if (specialties.some((specialty) => specialty.review === 'rejected')) {
    return 'rejected';
  }
  return 'none';
}

export const hasPendingSpecialties = (specialties: readonly MySpecialty[]) =>
  specialties.some(isPending);

export const rejectedSpecialties = (specialties: readonly MySpecialty[]) =>
  specialties.filter((specialty) => specialty.review === 'rejected');
