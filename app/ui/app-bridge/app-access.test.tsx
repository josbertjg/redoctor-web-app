import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import { AppAccess } from './app-access';

const support = {
  whatsapp: [{ label: 'Redoctor', phone: '+58 424 0000002' }],
  calls: [{ label: 'General', phone: '+58 414 0000001' }],
};

describe('AppAccess', () => {
  it('sends a specialist who just created the account to support while the app is in testing', async () => {
    const { container } = renderWithIntl(
      <AppAccess variant="created" stores={{}} support={support} />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '¡Tu cuenta está creada!',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/registra tu especialidad y tu número de colegiatura/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Escribir por WhatsApp a Redoctor, +58 424 0000002',
      }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/wa\.me\/584240000002\?text=/),
    );
    expect(screen.getByText('Redoctor: +58 424 0000002')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Llamar a General, +58 414 0000001' }),
    ).toHaveAttribute('href', 'tel:+584140000001');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('writes the WhatsApp message without anything personal', () => {
    renderWithIntl(
      <AppAccess variant="created" stores={{}} support={support} />,
    );

    const href = screen
      .getByRole('link', { name: /Escribir por WhatsApp/ })
      .getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(href ?? '')).toContain(
      'Soy especialista y quiero acceso a la app',
    );
  });

  it('shows the store, as a QR code and a button, once the app is published', async () => {
    const { container } = renderWithIntl(
      <AppAccess
        variant="finish"
        headingLevel={2}
        stores={{
          appStore: 'https://apps.apple.com/app/id123',
          playStore:
            'https://play.google.com/store/apps/details?id=com.redoctor.mobileapp',
        }}
        support={support}
      />,
    );

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Termina tu registro en la app',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Código QR para descargar la app en App Store',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Descargar en Google Play' }),
    ).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.redoctor.mobileapp',
    );
    expect(
      screen.queryByRole('link', { name: 'Escribir por WhatsApp' }),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
