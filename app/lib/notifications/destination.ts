import { routes } from '../routes';

/*
 * Where a notice leads, decided by the ids it carries and not by its
 * `kind` (the app's `NotificationRouteResolver`): the catalog lives in the
 * API and grows without notice, and any notice with an `appointmentId`
 * wants to lead to that appointment, whatever it is called tomorrow. A
 * notice that leads nowhere in particular is simply read.
 */

export type NotificationData = Readonly<Record<string, string>>;

/** The facets of the signed-in account: a destination nobody can open is none. */
export type NotificationAudience = {
  patient: boolean;
  specialist: boolean;
};

const billingPrefix = 'BILLING_';
const adminBillingPrefix = 'BILLING_ADMIN_';
const profilePrefix = 'PROFILE_';
const specialtyPrefix = 'SPECIALTY_';

/**
 * A billing notice: its `kind` is the catalog's key (`BILLING_*`, often
 * with a variant after it: `BILLING_BALANCE_CREDITED_GIFT`), and its
 * `billingEventType` the history's event, dotted (`subscription.past_due`).
 */
export function isBillingNotice(data: NotificationData): boolean {
  return (
    (data.kind ?? '').startsWith(billingPrefix) ||
    (data.billingEventType ?? '').includes('.')
  );
}

/** The admins' billing notices: their tools are in the app, not here. */
export function isAdminBillingNotice(data: NotificationData): boolean {
  return (data.kind ?? '').startsWith(adminBillingPrefix);
}

export function isProfileNotice(data: NotificationData): boolean {
  return (data.kind ?? '').startsWith(profilePrefix);
}

/** A specialty verified, rejected or sent again (`SPECIALTY_VERIFIED_MANY`…). */
export function isSpecialtyNotice(data: NotificationData): boolean {
  return (data.kind ?? '').startsWith(specialtyPrefix);
}

export type NotificationDestination =
  | ReturnType<typeof routes.appointment>
  | '/panel/agenda'
  | `/panel/agenda/${string}`
  | ReturnType<typeof routes.specialties>
  | ReturnType<typeof routes.subscription>
  | ReturnType<typeof routes.subscriptionPlans>
  | ReturnType<typeof routes.subscriptionCoupons>
  | ReturnType<typeof routes.subscriptionInvoices>
  | ReturnType<typeof routes.subscriptionBalance>
  | ReturnType<typeof routes.specialistProfile>;

/** A kind of the family `family`: the family itself, or a variant after it. */
const ofFamily = (kind: string, family: string) =>
  kind === family || kind.startsWith(`${family}_`);

/**
 * The billing notices lead to the page where what they tell is resolved,
 * as the app's table has it — by family, since the variants grow with the
 * catalog (`BILLING_REFUND_RECORDED_MOBILE`, `BILLING_DISCOUNT_ENDED_BY_ADMIN`):
 * a plan not activated or cancelled to the plans, coupons and discounts to
 * «Mis cupones», an adjustment to the receipts, the balance's movements to
 * the balance, and the rest — receipts, payments, debt, the change of plan —
 * to «Mi suscripción». Without a kind, its event says the same.
 */
function billingDestination(data: NotificationData): NotificationDestination {
  const kind = data.kind ?? '';
  const event = data.billingEventType ?? '';
  if (
    ofFamily(kind, 'BILLING_SUBSCRIPTION_NOT_ACTIVATED') ||
    kind.startsWith('BILLING_CANCELED') ||
    event === 'subscription.incomplete_expired' ||
    event === 'subscription.canceled'
  ) {
    return routes.subscriptionPlans();
  }
  if (
    ofFamily(kind, 'BILLING_COUPON_GIFTED') ||
    kind.startsWith('BILLING_DISCOUNT_') ||
    event.startsWith('discount.') ||
    event.startsWith('promotion_code.')
  ) {
    return routes.subscriptionCoupons();
  }
  if (
    ofFamily(kind, 'BILLING_ADJUSTMENT_ISSUED') ||
    event.startsWith('credit_note.')
  ) {
    return routes.subscriptionInvoices();
  }
  if (
    kind.startsWith('BILLING_BALANCE_') ||
    ofFamily(kind, 'BILLING_REFUND_RECORDED') ||
    event.startsWith('balance.') ||
    event.startsWith('refund.')
  ) {
    return routes.subscriptionBalance();
  }
  return routes.subscription();
}

const calendarDay = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The page a notice leads to, or `null` when it points at none this
 * account can open. Where the web differs from the app: a `PROFILE_*`
 * notice leads a specialist to «Mi perfil», where the web shows whether
 * patients find the profile (the app only refreshes its session).
 */
export function notificationDestination(
  data: NotificationData,
  audience: NotificationAudience,
): NotificationDestination | null {
  const appointmentId = data.appointmentId;
  if (appointmentId) return routes.appointment(appointmentId);

  if (isBillingNotice(data)) {
    if (!audience.specialist || isAdminBillingNotice(data)) return null;
    return billingDestination(data);
  }

  if (!audience.specialist) return null;

  // The daily summary opens that day's agenda (REDOC-359).
  if (data.kind === 'AGENDA_DAILY_SUMMARY') {
    const date = data.date ?? '';
    return calendarDay.test(date) ? routes.agenda(date) : routes.agenda();
  }
  if (isSpecialtyNotice(data)) return routes.specialties();
  if (isProfileNotice(data)) return routes.specialistProfile();

  return null;
}
