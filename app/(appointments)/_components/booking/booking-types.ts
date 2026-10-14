import type { DocumentType } from '@/app/lib/format/identity-document';
import type { BookingAttendee, BookingSex } from '@/app/lib/schemas/booking';

/** What the booking shows of the specialist: their public profile's, read on the server. */
export type BookingSpecialist = {
  id: string;
  name: string;
  photoUrl: string | null;
  verified: boolean;
  /** The verified specialties' names. */
  specialties: string[];
  offices: {
    id: string;
    name: string;
    address: string;
    description: string | null;
  }[];
};

/** The steps of the app's booking sheet; a specialist with one office skips the first. */
export const bookingSteps = ['office', 'slot', 'patient', 'summary'] as const;

export type BookingStep = (typeof bookingSteps)[number];

/** The patient step's form: the reason, who attends and, when someone new, their data. */
export type PatientValues = {
  reasonId: string;
  who: '' | 'SELF' | 'TERCERO';
  /** A person in the patient's care, `new` for someone else, or none chosen. */
  terceroId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: '' | BookingSex;
  documentType: DocumentType;
  documentNumber: string;
};

export const emptyPatientValues: PatientValues = {
  reasonId: '',
  who: '',
  terceroId: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  sex: '',
  documentType: 'V',
  documentNumber: '',
};

/** The patient step, answered: what the summary shows and the booking sends. */
export type PatientChoice = {
  values: PatientValues;
  reasonId: string | null;
  attendee: BookingAttendee;
};
