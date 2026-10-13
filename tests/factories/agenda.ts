import {
  buildAppointment,
  officeId,
  type AppointmentPayload,
} from './appointments';

/*
 * The specialist's side (M14): their patients' appointments, as
 * `GET /scheduling/specialist/appointments` lists them, their offices and
 * their statistics. The panel's tests fix the clock at `agendaNow` (only
 * `Date`, so MSW and the user events keep their timers), so "today" and
 * "the next one" never depend on when the suite runs.
 */

/** Wednesday 14 October 2026, 10:00 in Caracas. */
export const agendaNow = new Date('2026-10-14T14:00:00.000Z');
export const agendaToday = '2026-10-14';

/** The instant of a Caracas wall-clock hour on a day (UTC−4 all year). */
export function caracasAt(date: string, hour: number, minute = 0): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + 4, minute));
}

export const agendaIds = {
  earlyCompleted: 'd0000000-0000-4000-8000-000000000001',
  lateMorning: 'd0000000-0000-4000-8000-000000000002',
  afternoonPending: 'd0000000-0000-4000-8000-000000000003',
  afternoonCancelled: 'd0000000-0000-4000-8000-000000000004',
  yesterday: 'd0000000-0000-4000-8000-000000000005',
  earlierNoShow: 'd0000000-0000-4000-8000-000000000006',
  nextWeek: 'd0000000-0000-4000-8000-000000000007',
} as const;

const patient = (
  firstName: string,
  lastName: string,
  documentNumber?: string,
) => ({
  firstName,
  lastName,
  ...(documentNumber ? { documentType: 'V', documentNumber } : {}),
});

/** The specialist's appointments: four today, two before, one ahead. */
export function buildSpecialistAgenda(): AppointmentPayload[] {
  return [
    buildAppointment(
      {
        id: agendaIds.earlyCompleted,
        attendee: patient('Carlos', 'Rivas', '12345678'),
        reasonName: 'Primera consulta',
        status: 'COMPLETED',
        persistedStatus: 'COMPLETED',
      },
      caracasAt(agendaToday, 8),
    ),
    buildAppointment(
      {
        id: agendaIds.lateMorning,
        attendee: patient('Luisa', 'Méndez', '20111222'),
        reasonName: 'Control',
        status: 'CONFIRMED',
        persistedStatus: 'CONFIRMED',
      },
      caracasAt(agendaToday, 11),
    ),
    buildAppointment(
      {
        id: agendaIds.afternoonPending,
        attendee: patient('Pedro', 'Gil'),
        reasonName: null,
      },
      caracasAt(agendaToday, 15),
    ),
    buildAppointment(
      {
        id: agendaIds.afternoonCancelled,
        attendee: patient('Ana', 'Pérez'),
        status: 'CANCELLED',
        persistedStatus: 'CANCELLED',
        cancelledBy: 'PATIENT',
      },
      caracasAt(agendaToday, 16),
    ),
    buildAppointment(
      {
        id: agendaIds.yesterday,
        attendee: patient('Rosa', 'Lima', '9876543'),
        reasonName: 'Control',
        status: 'COMPLETED',
        persistedStatus: 'COMPLETED',
      },
      caracasAt('2026-10-13', 9),
    ),
    buildAppointment(
      {
        id: agendaIds.earlierNoShow,
        attendee: patient('Mario', 'Díaz'),
        status: 'NO_SHOW',
        persistedStatus: 'NO_SHOW',
      },
      caracasAt('2026-10-01', 10),
    ),
    buildAppointment(
      {
        id: agendaIds.nextWeek,
        attendee: patient('Elena', 'Soto', '15000111'),
        reasonName: 'Primera consulta',
      },
      caracasAt('2026-10-20', 9),
    ),
  ];
}

/** `GET /specialists/offices`: one office by default (no office filter shows). */
export function buildOffices(
  offices: { id: string; name: string }[] = [
    { id: officeId, name: 'Clínica Canaima' },
  ],
) {
  return {
    offices: offices.map((office) => ({
      ...office,
      specialistId: '5b8e2c14-3f1a-4d7e-9c2b-7a1e0f6d4b92',
      organizationId: null,
      address: 'Caracas',
      placeId: null,
      city: null,
      state: null,
      description: null,
      latitude: 10.4961,
      longitude: -66.8467,
      timezone: 'America/Caracas',
      pricingMode: 'STANDARD',
      isActive: true,
      deletedAt: null,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    })),
  };
}

/** `GET /reports/specialist`: a fortnight of a specialist's practice. */
export function buildSpecialistReport(overrides: Record<string, unknown> = {}) {
  return {
    range: {
      from: '2026-10-01',
      to: agendaToday,
      granularity: 'day',
      timezone: 'America/Caracas',
    },
    filters: { officeId: null },
    generatedAt: agendaNow.toISOString(),
    canExport: false,
    appointments: {
      total: 12,
      byStatus: {
        PENDING_CONFIRMATION: 2,
        CONFIRMED: 1,
        RESCHEDULE_PROPOSED: 0,
        CANCELLED: 2,
        COMPLETED: 6,
        NO_SHOW: 1,
      },
      cancelledBy: { PATIENT: 1, SPECIALIST: 1, SYSTEM: 0 },
      unclaimed: 3,
      newPatients: 4,
      returningPatients: 2,
      series: [
        {
          bucket: '2026-10-01',
          total: 2,
          completed: 1,
          cancelled: 0,
          noShow: 1,
        },
        {
          bucket: '2026-10-07',
          total: 4,
          completed: 2,
          cancelled: 1,
          noShow: 0,
        },
        {
          bucket: '2026-10-13',
          total: 6,
          completed: 3,
          cancelled: 1,
          noShow: 0,
        },
      ],
      byWeekdayHour: [
        { weekday: 2, hour: 9, total: 3 },
        { weekday: 4, hour: 15, total: 2 },
        { weekday: 1, hour: 10, total: 1 },
      ],
      byOffice: [{ officeId, officeName: 'Clínica Canaima', total: 12 }],
      previous: { total: 9, completed: 5, cancelled: 1, noShow: 2 },
    },
    income: {
      basis: 'COMPLETED',
      estimated: true,
      unpriced: 1,
      currencies: [
        {
          currency: 'USD',
          total: 210,
          appointments: 5,
          series: [
            { bucket: '2026-10-01', total: 30 },
            { bucket: '2026-10-07', total: 80 },
            { bucket: '2026-10-13', total: 100 },
          ],
          byReason: [
            {
              reasonId: 'r1',
              reasonName: 'Primera consulta',
              total: 150,
              appointments: 3,
            },
            {
              reasonId: 'r2',
              reasonName: 'Control',
              total: 60,
              appointments: 2,
            },
          ],
          byOffice: [
            {
              officeId,
              officeName: 'Clínica Canaima',
              total: 210,
              appointments: 5,
            },
          ],
          previous: { total: 180, appointments: 4 },
        },
      ],
    },
    reviews: {
      average: 4.6,
      count: 5,
      withComment: 3,
      distribution: { '1': 0, '2': 0, '3': 1, '4': 0, '5': 4 },
      series: [
        { bucket: '2026-10-07', average: 4.5, count: 2 },
        { bucket: '2026-10-13', average: 4.7, count: 3 },
      ],
      allTime: { average: 4.7, count: 18 },
      previous: { average: 4.4, count: 3 },
    },
    reasons: {
      total: 12,
      withoutReason: 2,
      items: [
        {
          reasonId: 'r1',
          reasonName: 'Primera consulta',
          total: 6,
          completed: 4,
          share: 0.6,
        },
        {
          reasonId: 'r2',
          reasonName: 'Control',
          total: 4,
          completed: 2,
          share: 0.4,
        },
      ],
    },
    ...overrides,
  };
}
