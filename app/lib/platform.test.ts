import { describe, expect, it } from 'vitest';

import { detectDevice, detectInAppBrowser } from './platform';

const userAgents = {
  iPhone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidFirefox:
    'Mozilla/5.0 (Android 15; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
  linuxDesktopSite:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

describe('detectDevice', () => {
  it('recognizes an iPhone', () => {
    expect(
      detectDevice({ userAgent: userAgents.iPhone, maxTouchPoints: 5 }),
    ).toEqual({
      isIOS: true,
      isAndroid: false,
      isAndroidChrome: false,
      isDesktop: false,
    });
  });

  it('tells an iPad from a Mac by its touch screen', () => {
    expect(
      detectDevice({ userAgent: userAgents.mac, maxTouchPoints: 5 }).isIOS,
    ).toBe(true);
    expect(
      detectDevice({ userAgent: userAgents.mac, maxTouchPoints: 0 }),
    ).toMatchObject({ isIOS: false, isDesktop: true });
  });

  it('knows which Android browsers understand intent links', () => {
    expect(
      detectDevice({ userAgent: userAgents.androidChrome, maxTouchPoints: 5 }),
    ).toMatchObject({ isAndroid: true, isAndroidChrome: true });
    expect(
      detectDevice({ userAgent: userAgents.androidFirefox, maxTouchPoints: 5 }),
    ).toMatchObject({ isAndroid: true, isAndroidChrome: false });
  });

  it('does not take an Android tablet asking for the desktop site for a computer', () => {
    expect(
      detectDevice({
        userAgent: userAgents.linuxDesktopSite,
        maxTouchPoints: 10,
      }).isDesktop,
    ).toBe(false);
  });

  it('recognizes a computer', () => {
    expect(
      detectDevice({ userAgent: userAgents.windows, maxTouchPoints: 0 })
        .isDesktop,
    ).toBe(true);
  });
});

describe('detectInAppBrowser', () => {
  it('names the browsers inside Instagram and Facebook', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.0.0',
      ),
    ).toBe('instagram');
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0;FBDV/iPhone15,2]',
      ),
    ).toBe('facebook');
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.0;]',
      ),
    ).toBe('facebook');
  });

  it('recognizes an Android web view', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('webview');
  });

  it('leaves real browsers alone', () => {
    expect(detectInAppBrowser(userAgents.androidChrome)).toBeNull();
    expect(detectInAppBrowser(userAgents.mac)).toBeNull();
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toBeNull();
  });
});
