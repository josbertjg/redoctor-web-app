/*
 * Which kind of device opened the page, for the app bridge (AGENTS.md §6).
 * Port of the detection in the prototype's app-bridge.js: the user agent, plus
 * the touch screen for the tablets that present themselves as computers.
 */

export type DeviceSignals = {
  userAgent: string;
  /** `navigator.maxTouchPoints`: 0 on a computer without a touch screen. */
  maxTouchPoints: number;
};

export type Device = {
  isIOS: boolean;
  isAndroid: boolean;
  /**
   * Chrome and the Chromium browsers of Android (Samsung Internet, Edge,
   * Opera) carry «Chrome/» and understand intent:// links. Firefox does not.
   */
  isAndroidChrome: boolean;
  /** A computer: there is no app to open there. */
  isDesktop: boolean;
};

export function detectDevice({
  userAgent,
  maxTouchPoints,
}: DeviceSignals): Device {
  const isAndroid = /Android/i.test(userAgent);
  // iPadOS presents itself as a Mac; its touch screen gives it away.
  const isIOS =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const isAndroidChrome =
    isAndroid && /Chrome\/\d/i.test(userAgent) && !/Firefox/i.test(userAgent);
  // Chrome on Android tablets asks for the desktop site and presents itself
  // as a Linux without «Android»: the touch screen gives it away too.
  const isDesktop =
    !isIOS && !isAndroid && !(/Linux/i.test(userAgent) && maxTouchPoints > 0);

  return { isIOS, isAndroid, isAndroidChrome, isDesktop };
}
