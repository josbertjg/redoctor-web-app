import type { AuthProvider } from '../auth/last-provider';
import type { LinkOrigin } from '../deep-links';
import type { AccountRole } from '../schemas/identity';

/*
 * The web's analytics events (AGENTS.md §9): `web_<area>_<action>`, with the
 * link's origin and the person's role as properties. Never names, emails,
 * phones, ids, tokens or appointment reasons. The final list is closed in
 * M12, before the funnels are built.
 */

/** Which shared link was opened: the kind, never the id or the token. */
export type LinkKind = 'specialist' | 'invitation' | 'appointment';

export type AnalyticsEvents = {
  web_link_opened: { origin: LinkOrigin; link: LinkKind };
  /** A deliberate sign-in that ended with an account the API knows. */
  web_signin_completed: { provider: AuthProvider; role: AccountRole };
  web_signout: Record<string, never>;
  /** A patient's sign-up step done on the web: the names, the personal data. */
  web_signup_completed: { step: 'register' | 'personal_data' };
};

export type AnalyticsEventName = keyof AnalyticsEvents;
