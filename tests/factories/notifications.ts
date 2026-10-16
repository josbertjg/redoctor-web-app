import { knownUserId } from './identity';

/*
 * What the API answers about the person's notifications, as its JSON
 * (OpenAPI `/notifications/*`): three notices by default — two unread about
 * appointments, one read from the system —, the newest first.
 */

export const cancelledNotificationId = 'c3d4e5f6-0000-4000-8000-000000000001';
export const reminderNotificationId = 'c3d4e5f6-0000-4000-8000-000000000002';
export const welcomeNotificationId = 'c3d4e5f6-0000-4000-8000-000000000003';

export type NotificationJson = {
  id: string;
  userId: string;
  title: string;
  body: string;
  data: Record<string, string> | null;
  type: 'SYSTEM' | 'APPOINTMENT' | 'REMINDER' | 'MARKETING' | 'ALERT';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
};

export function buildNotificationResponse(
  overrides: Partial<NotificationJson> = {},
): NotificationJson {
  return {
    id: cancelledNotificationId,
    userId: knownUserId,
    title: 'Cita cancelada',
    body: 'Ana Pérez canceló la cita del jueves 15 de octubre a las 3:00 p. m.',
    data: { kind: 'APPOINTMENT_CANCELLED_PATIENT', appointmentId: 'appt-1' },
    type: 'APPOINTMENT',
    status: 'SENT',
    sentAt: '2026-10-14T20:00:00.000Z',
    readAt: null,
    createdAt: '2026-10-14T20:00:00.000Z',
    ...overrides,
  };
}

export function buildReminderNotificationResponse(
  overrides: Partial<NotificationJson> = {},
): NotificationJson {
  return buildNotificationResponse({
    id: reminderNotificationId,
    title: 'Recordatorio de cita',
    body: 'Mañana a las 10:00 a. m. tienes cita con la Dra. Rojas en Clínica El Ávila.',
    data: { kind: 'APPOINTMENT_REMINDER', appointmentId: 'appt-2' },
    type: 'REMINDER',
    sentAt: '2026-10-14T19:00:00.000Z',
    createdAt: '2026-10-14T19:00:00.000Z',
    ...overrides,
  });
}

export function buildWelcomeNotificationResponse(
  overrides: Partial<NotificationJson> = {},
): NotificationJson {
  return buildNotificationResponse({
    id: welcomeNotificationId,
    title: 'Bienvenido a Redoctor',
    body: 'Aquí verás los avisos de tus citas y de tu cuenta.',
    data: { kind: 'WELCOME' },
    type: 'SYSTEM',
    status: 'READ',
    sentAt: '2026-10-13T15:00:00.000Z',
    readAt: '2026-10-13T16:00:00.000Z',
    createdAt: '2026-10-13T15:00:00.000Z',
    ...overrides,
  });
}

export function buildInboxResponse(
  notifications: NotificationJson[] = [
    buildNotificationResponse(),
    buildReminderNotificationResponse(),
    buildWelcomeNotificationResponse(),
  ],
  unreadCount = notifications.filter((item) => item.readAt === null).length,
) {
  return { notifications, unreadCount };
}
