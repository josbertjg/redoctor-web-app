import { isApiError } from './errors';

/*
 * Sends a write the server must not receive twice (claim, confirm, cancel,
 * reschedule, review, report a payment, subscribe) without trusting that its
 * answer arrives. Mirror of the app's `WriteOnceGuard`.
 *
 * When the answer is lost (`ApiError` kind 'uncertain') nobody knows whether
 * it landed. Before calling it failed, the guard looks for what the write
 * would have left; and before re-sending on the next attempt, it looks again.
 * Each flow only provides how to look (`findLanded`).
 *
 * Doubts are kept per `intent`, the identity of the operation, so the lost
 * confirmation of one appointment is never mistaken for another's.
 */

type WriteOnceRequest<T> = {
  intent: string;
  send: () => Promise<T>;
  /** What the write would have left, or null if it is not there. Throws if it cannot even look. */
  findLanded: () => Promise<T | null>;
};

const isLostAnswer = (error: unknown) =>
  isApiError(error) && error.kind === 'uncertain';

export function createWriteOnceGuard<T>(
  isUncertain: (error: unknown) => boolean = isLostAnswer,
) {
  const unresolved = new Map<string, () => Promise<T | null>>();

  return async function run({
    intent,
    send,
    findLanded,
  }: WriteOnceRequest<T>): Promise<T> {
    const pending = unresolved.get(intent);
    if (pending) {
      // If looking fails, nothing is re-sent: a duplicate is worse than waiting.
      const landed = await pending();
      unresolved.delete(intent);
      if (landed !== null) return landed;
    }

    try {
      return await send();
    } catch (error) {
      if (!isUncertain(error)) throw error;

      // Looking right away saves the second tap when it did land. If it is not
      // there yet, the server may still be on it: the doubt stays for the next try.
      unresolved.set(intent, findLanded);
      let landed: T | null = null;
      try {
        landed = await findLanded();
      } catch {
        // Could not look: keep the doubt and report the lost answer.
      }
      if (landed === null) throw error;
      unresolved.delete(intent);
      return landed;
    }
  };
}
