import { screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { noSupport } from '@/app/lib/support';

import { renderWithIntl } from '@/tests/render';

import { LandingFooter } from './landing-footer';

const support = {
  whatsapp: [{ label: 'Soporte', phone: '+58 424-0000002' }],
  calls: [{ label: 'Oficina', phone: '+58 212-0000001' }],
};

const contactList = () =>
  within(screen.getByRole('list', { name: 'Contáctanos' }));

describe('LandingFooter', () => {
  it('offers Redoctor’s own channels: the email, the API’s WhatsApp and call lines, and the Instagram', async () => {
    const { container } = renderWithIntl(<LandingFooter support={support} />);

    expect(
      contactList().getByRole('link', { name: 'gerencia@redoctorapp.com' }),
    ).toHaveAttribute('href', 'mailto:gerencia@redoctorapp.com');
    const whatsapp = contactList().getByRole('link', {
      name: 'WhatsApp +58 424-0000002',
    });
    expect(whatsapp.getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/584240000002\?text=/,
    );
    // The message says nothing about the person: the link passes through wa.me.
    expect(
      decodeURIComponent(
        whatsapp.getAttribute('href')?.split('text=')[1] ?? '',
      ),
    ).toBe('Hola, les escribo desde la web de Redoctor.');
    expect(
      contactList().getByRole('link', { name: '+58 212-0000001' }),
    ).toHaveAttribute('href', 'tel:+582120000001');
    expect(
      contactList().getByRole('link', { name: '@redoctorapp' }),
    ).toHaveAttribute('href', 'https://www.instagram.com/redoctorapp');
    expect(
      screen.queryByText(/redoctor@gmail\.com|0212-1234567|redoctorvzla/),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('leaves the phones out when the API publishes none', () => {
    renderWithIntl(<LandingFooter support={noSupport} />);

    expect(
      contactList()
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['gerencia@redoctorapp.com', '@redoctorapp']);
  });
});
