import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import DeleteAccountPage from './page';

describe('DeleteAccountPage', () => {
  it('explains how to ask for the deletion, with the support channels', async () => {
    const { container } = renderWithIntl(<DeleteAccountPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Eliminar mi cuenta' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Contenido' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Cómo pedirla' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp al/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/wa\.me\/58/),
    );
    expect(
      screen.getByRole('link', { name: 'Política de privacidad' }),
    ).toHaveAttribute('href', '/privacy');

    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);
});
