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
 * confirmation of one appointment is never mistaken for another's. Two runs
 * of one intent at the same time share the first one's outcome.
 */

type WriteOnceRequest<T> = {
  intent: string;
  send: () => Promise<T>;
  /** What the write would have left, or null if it is not there. Throws if it cannot even look. */
  findLanded: () => Promise<T | null>;
};

/*
 * Whether the write may have landed although it failed: its answer was lost;
 * the server answered 2xx with a body that breaks the contract (it landed);
 * or a gateway failed (5xx) between the server and us. The app's payment
 * report counts every failure but a business refusal this way.
 */
const mayHaveLanded = (error: unknown) =>
  isApiError(error) &&
  (error.kind === 'uncertain' ||
    error.kind === 'invalid-response' ||
    (error.kind === 'http' &&
      error.status !== undefined &&
      error.status >= 500));

export function createWriteOnceGuard<T>(
  isUncertain: (error: unknown) => boolean = mayHaveLanded,
) {
  const unresolved = new Map<string, () => Promise<T | null>>();
  const inFlight = new Map<string, Promise<T>>();

  async function attempt({
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
  }

  return function run(request: WriteOnceRequest<T>): Promise<T> {
    const running = inFlight.get(request.intent);
    if (running) return running;
    const outcome = attempt(request).finally(() => {
      inFlight.delete(request.intent);
    });
    inFlight.set(request.intent, outcome);
    return outcome;
  };
}
