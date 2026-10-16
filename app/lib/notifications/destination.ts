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

/**
 * The kind of a billing notice: the app's own carry it in `kind`, the
 * billing engine's also in `billingEventType`.
 */
export function billingType(data: NotificationData): string {
  const kind = data.kind ?? '';
  if (kind.startsWith(billingPrefix)) return kind;
  return data.billingEventType ?? kind;
}

export function isBillingNotice(data: NotificationData): boolean {
  return billingType(data).startsWith(billingPrefix);
}

/** The admins' billing notices: their tools are in the app, not here. */
export function isAdminBillingNotice(data: NotificationData): boolean {
  return billingType(data).startsWith(adminBillingPrefix);
}

export function isProfileNotice(data: NotificationData): boolean {
  return (data.kind ?? '').startsWith(profilePrefix);
}

export type NotificationDestination =
  | ReturnType<typeof routes.appointment>
  | ReturnType<typeof routes.subscription>
  | ReturnType<typeof routes.subscriptionPlans>
  | ReturnType<typeof routes.subscriptionCoupons>
  | ReturnType<typeof routes.subscriptionInvoices>
  | ReturnType<typeof routes.subscriptionBalance>
  | ReturnType<typeof routes.specialistProfile>;

const couponKinds = new Set([
  'BILLING_COUPON_GIFTED',
  'BILLING_DISCOUNT_APPLIED',
  'BILLING_DISCOUNT_ENDED',
]);

const balanceKinds = new Set([
  'BILLING_BALANCE_CREDITED',
  'BILLING_BALANCE_APPLIED',
  'BILLING_REFUND_RECORDED',
]);

/**
 * The billing notices lead to the page where what they tell is resolved,
 * as the app's table has it: a plan not activated or cancelled to the
 * plans, coupons and discounts to «Mis cupones», an adjustment to the
 * receipts, the balance's movements to the balance, and the rest —
 * receipts, payments, debt, the change of plan — to «Mi suscripción».
 */
function billingDestination(type: string): NotificationDestination {
  if (
    type === 'BILLING_SUBSCRIPTION_NOT_ACTIVATED' ||
    type.startsWith('BILLING_CANCELED')
  ) {
    return routes.subscriptionPlans();
  }
  if (couponKinds.has(type)) return routes.subscriptionCoupons();
  if (type === 'BILLING_ADJUSTMENT_ISSUED')
    return routes.subscriptionInvoices();
  if (balanceKinds.has(type)) return routes.subscriptionBalance();
  return routes.subscription();
}

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
    return billingDestination(billingType(data));
  }

  if (isProfileNotice(data) && audience.specialist) {
    return routes.specialistProfile();
  }

  return null;
}
