import { screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import TermsPage from './page';

describe('TermsPage', () => {
  it('renders the terms, their contents and the links to the other legal pages', async () => {
    const { container } = renderWithIntl(
      // A server page: it reads the support lines before it renders.
      await TermsPage(),
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Términos y condiciones de uso',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Última actualización:/)).toBeInTheDocument();

    const contents = screen.getByRole('navigation', { name: 'Contenido' });
    expect(within(contents).getAllByRole('link')).toHaveLength(20);
    expect(
      within(contents).getByRole('link', {
        name: '7. Planes, pagos y facturación',
      }),
    ).toHaveAttribute('href', '#plans');
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '7. Planes, pagos y facturación',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole('link', { name: 'Política de privacidad' })[0],
    ).toHaveAttribute('href', '/privacy');
    expect(
      screen.getByRole('link', { name: 'Eliminar mi cuenta' }),
    ).toHaveAttribute('href', '/delete-account');
    expect(screen.getByRole('link', { name: /WhatsApp al/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/wa\.me\/58/),
    );
    expect(
      screen.getByRole('link', { name: 'gerencia@redoctorapp.com' }),
    ).toHaveAttribute('href', 'mailto:gerencia@redoctorapp.com');

    const text = container.textContent;
    expect(text).not.toMatch(/\[.*\]/);
    expect(text).not.toMatch(/récipes?\s+(médicos?\s+)?digitales?/i);
    expect(text).not.toMatch(/factura fiscal/i);
    expect(text).not.toMatch(/inteligencia artificial/i);
    expect(text).toMatch(/LOPNNA/);
    expect(text).toMatch(/911/);
    expect(text).toMatch(/Banco Central de Venezuela/);
    expect(text).toMatch(/tres \(3\) inasistencias/);
    expect(text).toMatch(/forma anónima/);
    expect(text).toMatch(/Barquisimeto, Estado Lara/);

    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);
});
