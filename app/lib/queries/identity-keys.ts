/*
 * The cache keys of the account, apart from its reader: the session
 * provider names the key on every page, and the reader — zod and the API's
 * contract — loads only once someone is signed in (app/lib/queries/identity.ts).
 */
export const identityKeys = {
  me: (userId: string) => ['identity', 'me', userId] as const,
};
