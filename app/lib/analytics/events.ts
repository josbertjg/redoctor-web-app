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
  /** An appointment booked from a specialist's profile (M15): for oneself or for someone in one's care. */
  web_appointment_booked: { relationship: 'self' | 'dependent' };
  /** What the patient did with their appointment (M5). */
  web_appointment_confirmed: Record<string, never>;
  web_appointment_cancelled: Record<string, never>;
  web_appointment_rescheduled: Record<string, never>;
  web_appointment_calendar_added: { calendar: 'google' | 'ics' };
  /** A finished consultation rated (M7): with a comment or stars alone. */
  web_review_submitted: { comment: boolean };
  /** A specialist took a plan on the web (M13): with a coupon or not, and whether it covered the month whole. */
  web_subscription_created: { coupon: boolean; free: boolean };
  /** A specialist changed plan on the web: up, paying the difference, or down at the period's end. */
  web_subscription_plan_changed: { kind: 'upgrade' | 'downgrade' };
  /** A downgrade waiting for the period's end, undone on the web. */
  web_subscription_change_undone: Record<string, never>;
  /** A plan asked to end with its period, on the web. */
  web_subscription_canceled: Record<string, never>;
  /** A cancellation taken back before the period's end, on the web. */
  web_subscription_resumed: Record<string, never>;
  /** An unpaid subscription dropped on the web, to choose another plan. */
  web_subscription_abandoned: Record<string, never>;
  /** A coupon put on the plan in force, on the web: typed, or one of «Mis cupones». Never the code. */
  web_subscription_coupon_applied: { saved: boolean };
  /** A code kept in «Mis cupones» on the web. Never the code. */
  web_coupon_saved: Record<string, never>;
  /** A payment reported on the web (M13): how it was paid. Never the amount or the reference. */
  web_payment_reported: { method: 'mobile_payment' | 'bank_transfer' };
};

export type AnalyticsEventName = keyof AnalyticsEvents;
