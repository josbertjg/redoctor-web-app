import {
  isAdminBillingNotice,
  isBillingNotice,
  isProfileNotice,
  isSpecialtyNotice,
  type NotificationAudience,
  type NotificationData,
} from './destination';

import type { QueryKey } from '@tanstack/react-query';

/*
 * A notification is the proof that some state of the server went stale
 * (the app's `NotificationEffects`): told that an appointment was
 * cancelled, the appointments the page holds no longer stand. So each
 * notice names what it leaves old, and the provider reads it again — by
 * the ids the notice carries before its kind, as the destination does,
 * so a kind born tomorrow still refreshes what it touches. Several notices
 * in a row are one refresh per target, not one each.
 */

export type StaleTarget =
  'appointments' | 'statistics' | 'subscription' | 'session' | 'pendingReviews';

export function staleTargets(
  data: NotificationData,
  audience: NotificationAudience,
): StaleTarget[] {
  const kind = data.kind ?? '';
  const targets = new Set<StaleTarget>();

  const touchesAppointment =
    Boolean(data.appointmentId) || kind.startsWith('APPOINTMENT_');
  if (touchesAppointment) {
    targets.add('appointments');
    // The specialist's statistics come out of their appointments.
    if (audience.specialist) targets.add('statistics');
  }

  // Any billing notice leaves the subscription and its receipts old, and
  // the billing decides whether the profile stays published: that lives
  // in the session.
  if (isBillingNotice(data) && !isAdminBillingNotice(data)) {
    targets.add('subscription');
    targets.add('session');
  }

  // A profile published or not, a specialty verified or rejected: the
  // account's state, «Mi perfil» and «Mis especialidades» read again.
  if (isProfileNotice(data) || isSpecialtyNotice(data)) {
    targets.add('session');
  }

  // A finished consultation is when a pending review is born — for the
  // patient; the specialist gets the same notice and rates nobody.
  if (kind === 'APPOINTMENT_COMPLETED' && audience.patient) {
    targets.add('pendingReviews');
  }

  return [...targets];
}

/**
 * What a signal (`data:changed`, REDOC-358) leaves old, by its scope: the
 * same targets a notice names. Since 2026-10-26 much of what reaches a
 * specialist comes only this way — an appointment changed, confirmed or
 * closed, an invitation claimed, a review received —, so without it the
 * agenda would not keep up. A scope the web has nothing of (favourites,
 * the admins' queues) or one born tomorrow refreshes nothing.
 */
export function signalTargets(
  scope: string,
  audience: NotificationAudience,
): StaleTarget[] {
  switch (scope) {
    case 'appointments':
      return audience.specialist
        ? ['appointments', 'statistics']
        : ['appointments'];
    case 'subscription':
      return ['subscription', 'session'];
    case 'profile':
    case 'account':
      return ['session'];
    case 'reviews':
      return audience.specialist ? ['statistics'] : ['pendingReviews'];
    default:
      return [];
  }
}

/** Every target, for coming back after the channel was down a while. */
export function allTargets(audience: NotificationAudience): StaleTarget[] {
  const targets: StaleTarget[] = ['appointments', 'session'];
  if (audience.specialist) targets.push('statistics', 'subscription');
  if (audience.patient) targets.push('pendingReviews');
  return targets;
}

/**
 * The cache keys each target covers, as prefixes: whatever hangs from them
 * is read again. Written out here instead of imported from the query
 * modules, which carry zod and the contracts and must not travel with
 * every page; a test keeps them equal to the builders.
 */
export function staleQueryKeys(
  target: StaleTarget,
  userId: string,
): readonly QueryKey[] {
  switch (target) {
    case 'appointments':
      return [
        ['appointments', userId],
        ['specialist-appointments', userId],
        ['appointment', userId],
      ];
    case 'statistics':
      return [['report', 'specialist', userId]];
    case 'subscription':
      return [
        ['billing', 'subscription', userId],
        ['billing', 'payable', userId],
        ['billing', 'invoices', userId],
        ['billing', 'balance', userId],
        ['billing', 'coupons', userId],
      ];
    case 'session':
      return [
        ['identity', 'me', userId],
        ['specialists', 'profile', userId],
        // «Mi perfil» shows the offices, which the app edits.
        ['offices', userId],
      ];
    case 'pendingReviews':
      return [['reviews', 'pending', userId]];
  }
}

/** The margin to group notices that arrive together (the app's). */
export const STALE_DEBOUNCE_MS = 600;

export type StaleScheduler = {
  schedule: (target: StaleTarget) => void;
  cancelAll: () => void;
};

/** One refresh per target once the notices stop coming, never one per notice. */
export function createStaleScheduler(
  run: (target: StaleTarget) => void,
  delayMs = STALE_DEBOUNCE_MS,
): StaleScheduler {
  const pending = new Map<StaleTarget, ReturnType<typeof setTimeout>>();
  return {
    schedule(target) {
      const timer = pending.get(target);
      if (timer !== undefined) clearTimeout(timer);
      pending.set(
        target,
        setTimeout(() => {
          pending.delete(target);
          run(target);
        }, delayMs),
      );
    },
    cancelAll() {
      pending.forEach((timer) => {
        clearTimeout(timer);
      });
      pending.clear();
    },
  };
}
