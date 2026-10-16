import { afterEach, describe, expect, it } from 'vitest';

import {
  clearDeclined,
  describeBrowser,
  deviceId,
  forgetRegistration,
  HEARTBEAT_INTERVAL_MS,
  heartbeatIsDue,
  loadRegistration,
  markDeclined,
  markHeartbeat,
  saveRegistration,
  wasDeclined,
} from './push';

afterEach(() => {
  window.localStorage.clear();
});

describe('deviceId', () => {
  it('makes one identity for this browser and keeps it', () => {
    const first = deviceId();

    expect(first).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
    expect(deviceId()).toBe(first);
  });

  it('replaces one that does not fit the API shape', () => {
    window.localStorage.setItem('redoctor-device-id', 'short');

    expect(deviceId()).not.toBe('short');
  });
});

describe('the registration record', () => {
  it('remembers with whom and with which token the browser was registered', () => {
    expect(loadRegistration()).toBeNull();

    saveRegistration({ userId: 'uid-1', token: 'fcm-1' });
    expect(loadRegistration()).toEqual({ userId: 'uid-1', token: 'fcm-1' });

    forgetRegistration();
    expect(loadRegistration()).toBeNull();
  });

  it('ignores a record it cannot read', () => {
    window.localStorage.setItem('redoctor-push-registration', '{"userId":1}');
    expect(loadRegistration()).toBeNull();

    window.localStorage.setItem('redoctor-push-registration', 'not json');
    expect(loadRegistration()).toBeNull();
  });
});

describe('the heartbeat', () => {
  it('is due with none yet, then every twelve hours', () => {
    const now = Date.UTC(2026, 9, 14, 20);

    expect(heartbeatIsDue(now)).toBe(true);
    markHeartbeat(now);
    expect(heartbeatIsDue(now + HEARTBEAT_INTERVAL_MS - 1)).toBe(false);
    expect(heartbeatIsDue(now + HEARTBEAT_INTERVAL_MS)).toBe(true);
  });
});

describe('the «Ahora no»', () => {
  it('is remembered until the permission comes', () => {
    expect(wasDeclined()).toBe(false);
    markDeclined();
    expect(wasDeclined()).toBe(true);
    clearDeclined();
    expect(wasDeclined()).toBe(false);
  });
});

describe('describeBrowser', () => {
  it('names the browser and the system, never the version', () => {
    expect(
      describeBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome · macOS');
    expect(
      describeBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
      ),
    ).toBe('Edge · Windows');
    expect(
      describeBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari · iOS');
    expect(
      describeBrowser(
        'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('Chrome · Android');
    expect(
      describeBrowser(
        'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
      ),
    ).toBe('Firefox · Linux');
    expect(describeBrowser('Something else')).toBe('Navegador');
  });
});
