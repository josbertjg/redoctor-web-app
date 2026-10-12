import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import { AppAccess } from './app-access';

const support = {
  whatsapp: {
    label: 'Redoctor',
    number: '0422 736 2867',
    href: 'https://wa.me/584227362867?text=Hola',
  },
  phones: [
    { label: 'Soporte 1', number: '0414 559 8216', href: 'tel:+584145598216' },
  ],
};

describe('AppAccess', () => {
  it('sends a new specialist to support while the app is in testing', async () => {
    const { container } = renderWithIntl(
      <AppAccess variant="join" stores={{}} support={support} />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'El registro de especialistas se hace en la app',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Escribir por WhatsApp' }),
    ).toHaveAttribute('href', 'https://wa.me/584227362867?text=Hola');
    expect(
      screen.getByRole('link', { name: 'Llamar a Soporte 1, 0414 559 8216' }),
    ).toHaveAttribute('href', 'tel:+584145598216');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('writes the default WhatsApp message without anything personal', () => {
    renderWithIntl(<AppAccess variant="join" stores={{}} />);

    const href = screen
      .getByRole('link', { name: 'Escribir por WhatsApp' })
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
