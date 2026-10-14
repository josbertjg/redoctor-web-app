import type {
  OfficeServicesResponse,
  TercerosResponse,
} from '@/app/lib/schemas/booking';

import { knownUserId } from './identity';

/** The ids the booking's handlers know. */
export const bookingIds = {
  /** The reason with no price of its own: the office's standard one. */
  generalReason: 'd1d1d1d1-0000-4000-8000-000000000001',
  /** The reason with its own price. */
  followUpReason: 'd1d1d1d1-0000-4000-8000-000000000002',
  /** Someone in the patient's care already. */
  sofia: 'c0c0c0c0-0000-4000-8000-000000000001',
  /** What `POST /scheduling/appointments` answers. */
  booked: 'e5e5e5e5-0000-4000-8000-000000000001',
  /** An office whose specialist is not active: every booking read answers 404. */
  inactiveOffice: 'f0f0f0f0-0000-4000-8000-000000000404',
  /** The catalog's «Medicina Interna», the test profile's most specific specialty. */
  internalMedicine: 'a0000000-0000-4000-8000-000000000031',
} as const;

/** What `GET /scheduling/offices/{id}/services` answers: one price by reason, one standard. */
export function buildOfficeServices(
  overrides: Partial<OfficeServicesResponse> = {},
): OfficeServicesResponse {
  return {
    pricingMode: 'PER_REASON',
    standardPrice: {
      type: 'FIXED',
      currency: 'USD',
      amount: 40,
      minAmount: null,
      maxAmount: null,
    },
    reasons: [
      {
        id: bookingIds.generalReason,
        name: 'Consulta general',
        price: null,
      },
      {
        id: bookingIds.followUpReason,
        name: 'Control',
        price: {
          type: 'FIXED',
          currency: 'USD',
          amount: 25,
          minAmount: null,
          maxAmount: null,
        },
      },
    ],
    ...overrides,
  };
}

/** What `GET /scheduling/terceros` answers: one girl in the patient's care. */
export function buildTerceros(): TercerosResponse & Record<string, unknown> {
  return {
    terceros: [
      {
        id: bookingIds.sofia,
        firstName: 'Sofía',
        lastName: 'Pérez',
        dateOfBirth: '2019-03-01',
        sex: 'FEMALE',
        documentType: null,
        documentNumber: null,
        deletedAt: null,
        // The API's, which the web does not read.
        ...{ managedByUserId: knownUserId, minorWithoutDocument: true },
      },
    ],
  };
}
