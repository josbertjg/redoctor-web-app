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
  /** An invitation claimed (M4): for oneself or for someone in one's care, and confirmed in the same step or not. */
  web_invitation_claimed: {
    relationship: 'self' | 'dependent';
    confirmed: boolean;
  };
  /** What the patient did with their appointment (M5). */
  web_appointment_confirmed: Record<string, never>;
  web_appointment_cancelled: Record<string, never>;
  web_appointment_rescheduled: Record<string, never>;
  web_appointment_calendar_added: { calendar: 'google' | 'ics' };
  /** A finished consultation rated (M7): with a comment or stars alone. */
  web_review_submitted: { comment: boolean };
};

export type AnalyticsEventName = keyof AnalyticsEvents;
