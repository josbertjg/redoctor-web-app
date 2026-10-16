/*
 * The cache keys of the inbox, apart from its reader: the notifications
 * provider names the key on every page, and the reader — zod and the API's
 * contract — loads only once someone is signed in
 * (app/lib/queries/notifications.ts), as the account's does.
 */
export const notificationKeys = {
  inbox: (userId: string) => ['notifications', 'inbox', userId] as const,
};
