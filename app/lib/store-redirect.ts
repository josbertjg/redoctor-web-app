/*
 * The bridge's redirect to the store (prototype's app-bridge.js): only when
 * the platform's listing exists, after a pause counted with the «Abrir en la
 * app» button already on screen. Whoever leaves the page in the meantime
 * (the app opened, another tab) already chose, so it never happens behind
 * their back.
 */

export const STORE_REDIRECT_DELAY_MS = 3000;

type StoreRedirectOptions = {
  delayMs?: number;
  navigate?: (url: string) => void;
};

/** Schedules the redirect; returns the function that cancels it. */
export function scheduleStoreRedirect(
  storeUrl: string,
  {
    delayMs = STORE_REDIRECT_DELAY_MS,
    navigate = (url) => {
      window.location.assign(url);
    },
  }: StoreRedirectOptions = {},
): () => void {
  const onVisibilityChange = () => {
    if (document.hidden) cancel();
  };

  const timer = setTimeout(() => {
    cancel();
    if (!document.hidden) navigate(storeUrl);
  }, delayMs);

  function cancel() {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', cancel);
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', cancel);
  return cancel;
}
