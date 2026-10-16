import { z } from 'zod';

/*
 * The notifications contract (OpenAPI `/notifications/*`, the payloads of
 * the Socket.IO channel and the device tokens of the push). The inbox is the
 * source of truth of the whole system: the live channel and the push only
 * tell sooner what the inbox already holds — the app reads the same API the
 * same way (its `AppNotification`).
 */

export const notificationTypes = [
  'SYSTEM',
  'APPOINTMENT',
  'REMINDER',
  'MARKETING',
  'ALERT',
] as const;

/** The family of a notice: it decides the icon and the colour it is drawn with. */
export type NotificationType = (typeof notificationTypes)[number];

/** A type this version does not know reads as a system notice, never as a broken inbox. */
const notificationTypeSchema = z.enum(notificationTypes).catch('SYSTEM');

/**
 * The payload that travels with a notice (`kind`, `appointmentId`,
 * `billingEventType`…). Its values are strings; anything else is read as one.
 */
const notificationDataSchema = z
  .record(z.string(), z.coerce.string())
  .nullable()
  .optional();

/** The contract declares the instants without a type: they are read as they come. */
const instantSchema = z.unknown().optional();

export const notificationResponseSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  data: notificationDataSchema,
  type: notificationTypeSchema,
  readAt: instantSchema,
  createdAt: instantSchema,
});

export type NotificationResponse = z.infer<typeof notificationResponseSchema>;

export const inboxResponseSchema = z.object({
  notifications: z.array(notificationResponseSchema),
  unreadCount: z.number().int(),
});

export type InboxResponse = z.infer<typeof inboxResponseSchema>;

/** A notice of the person's inbox, as the web reasons about it. */
export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  /**
   * What it is about. Who reads it decides by the ids it carries
   * (`appointmentId`) before its `kind`: the catalog lives in the API and
   * grows without notice (app/lib/notifications/destination.ts).
   */
  data: Readonly<Record<string, string>>;
  type: NotificationType;
  read: boolean;
  /** When it was read, when the API says so as a date; `null` otherwise. */
  readAt: string | null;
  /** When it was created, when the API says so as a date; `null` otherwise. */
  createdAt: string | null;
};

export type Inbox = {
  /** The newest first, as the API lists them. */
  notifications: InboxNotification[];
  /**
   * The person's unread notices, which may be more than the inbox lists:
   * the API counts them all and lists `limit` at most.
   */
  unreadCount: number;
};

/** An ISO instant out of what the API sent, or `null` when it is not a date. */
function toInstant(value: unknown): string | null {
  if (typeof value === 'string') {
    return Number.isNaN(new Date(value).getTime()) ? null : value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
}

export function toNotification(raw: NotificationResponse): InboxNotification {
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    data: raw.data ?? {},
    type: raw.type,
    // `null` is exactly "unread"; anything the API set means it was read.
    read: raw.readAt !== null && raw.readAt !== undefined,
    readAt: toInstant(raw.readAt),
    createdAt: toInstant(raw.createdAt),
  };
}

export function toInbox(raw: InboxResponse): Inbox {
  return {
    notifications: raw.notifications.map(toNotification),
    unreadCount: Math.max(0, raw.unreadCount),
  };
}

/* The live channel (`/ws/notifications`, app/lib/notifications/socket.ts). */

/** `notification:created`: a notice was just created for this person. */
export const notificationCreatedPayloadSchema = z.object({
  notification: notificationResponseSchema,
  /** The server's unread total; absent, the local count moves by itself. */
  unreadCount: z.number().int().nullable().optional(),
});

/** `notification:unread`: the count moved, maybe from another device. */
export const unreadCountPayloadSchema = z.object({
  unreadCount: z.coerce.number().int(),
});

/* What the writes answer. */

export const readAllResponseSchema = z.object({ updated: z.number().int() });

export const deletedResponseSchema = z.object({ deleted: z.boolean() });

export const clearedResponseSchema = z.object({ deleted: z.number().int() });

/* The push: this browser as one of the person's devices. */

export const devicePlatforms = ['IOS', 'ANDROID', 'WEB'] as const;

export const deviceTokenBodySchema = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(devicePlatforms),
  /** A stable identity of the device, not of the session (8–128 of `[A-Za-z0-9._:-]`). */
  deviceId: z
    .string()
    .regex(/^[A-Za-z0-9._:-]{8,128}$/)
    .optional(),
  deviceName: z.string().min(1).max(120).optional(),
  appVersion: z.string().min(1).max(40).optional(),
});

export type DeviceTokenBody = z.infer<typeof deviceTokenBodySchema>;

/** `registered: false` means this device is no longer the person's: a sign-out from afar. */
export const heartbeatResponseSchema = z.object({ registered: z.boolean() });
