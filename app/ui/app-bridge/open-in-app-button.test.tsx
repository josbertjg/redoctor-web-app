import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppBridgeConfig } from '@/app/lib/deep-links';
import { scheduleStoreRedirect } from '@/app/lib/store-redirect';

import { renderWithIntl } from '@/tests/render';

import { OpenInAppButton } from './open-in-app-button';

const config = vi.hoisted((): AppBridgeConfig => ({
  androidPackage: 'com.redoctor.mobileapp',
}));
vi.mock('@/app/lib/app-bridge-config', () => ({ appBridgeConfig: config }));

const cancelRedirect = vi.hoisted(() => vi.fn());
vi.mock('@/app/lib/store-redirect', () => ({
  scheduleStoreRedirect: vi.fn(() => cancelRedirect),
}));

const devices = {
  iPhone: {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
    maxTouchPoints: 5,
  },
  androidChrome: {
    userAgent:
      'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
    maxTouchPoints: 5,
  },
  computer: {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    maxTouchPoints: 0,
  },
};

function pretendDevice(device: keyof typeof devices) {
  for (const [name, value] of Object.entries(devices[device])) {
    Object.defineProperty(window.navigator, name, {
      value,
      configurable: true,
    });
  }
}

// jsdom cannot navigate; the test only needs the click itself.
const stopNavigation = (event: MouseEvent) => {
  event.preventDefault();
};

beforeEach(() => {
  document.addEventListener('click', stopNavigation);
});

afterEach(() => {
  document.removeEventListener('click', stopNavigation);
  // Back to jsdom's own values, defined on the prototype.
  Reflect.deleteProperty(window.navigator, 'userAgent');
  Reflect.deleteProperty(window.navigator, 'maxTouchPoints');
  delete config.appStoreId;
  delete config.playStoreId;
});

describe('OpenInAppButton', () => {
  it('opens the same page in the app through its scheme on an iPhone', async () => {
    pretendDevice('iPhone');
    const { container } = renderWithIntl(
      <OpenInAppButton path="/suscripcion" source="email" />,
    );

    const link = await screen.findByRole('link', { name: 'Abrir en la app' });
    expect(link).toHaveAttribute(
      'href',
      'redoctor://localhost:3000/suscripcion',
    );
    expect(screen.queryByRole('link', { name: /App Store|Google Play/ })).toBe(
      null,
    );
    expect(scheduleStoreRedirect).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('uses an intent that falls back to this page on Android Chrome', async () => {
    pretendDevice('androidChrome');
    renderWithIntl(<OpenInAppButton path="/a/123" />);

    const link = await screen.findByRole('link', { name: 'Abrir en la app' });
    expect(link).toHaveAttribute(
      'href',
      'intent://localhost:3000/a/123#Intent;scheme=redoctor;package=com.redoctor.mobileapp;' +
        'S.browser_fallback_url=http%3A%2F%2Flocalhost%3A3000%2Fa%2F123;end',
    );
  });

  it('says to use the phone on a computer, where there is no app', async () => {
    pretendDevice('computer');
    renderWithIntl(<OpenInAppButton path="/suscripcion" source="email" />);

    expect(
      await screen.findByText(
        'Abre este correo desde tu teléfono, donde tienes la app de Redoctor.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBe(null);
  });

  it('offers the platform store once it exists, and never redirects after a tap', async () => {
    config.appStoreId = '1234567890';
    config.playStoreId = 'com.redoctor.mobileapp';
    pretendDevice('iPhone');
    renderWithIntl(<OpenInAppButton path="/s/abc" />);

    expect(
      await screen.findByRole('link', { name: 'Descargar en App Store' }),
    ).toHaveAttribute('href', 'https://apps.apple.com/app/id1234567890');
    expect(
      screen.queryByRole('link', { name: 'Descargar en Google Play' }),
    ).toBe(null);
    expect(scheduleStoreRedirect).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id1234567890',
    );

    await userEvent.click(
      screen.getByRole('link', { name: 'Abrir en la app' }),
    );
    expect(cancelRedirect).toHaveBeenCalled();
  });
});
