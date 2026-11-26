import { screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('renders the policy, its contents and the links to the other legal pages', async () => {
    const { container } = renderWithIntl(
      // A server page: it reads the support lines before it renders.
      await PrivacyPage(),
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Política de privacidad' }),
    ).toBeInTheDocument();

    const contents = screen.getByRole('navigation', { name: 'Contenido' });
    expect(within(contents).getAllByRole('link')).toHaveLength(14);
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '9. Datos de salud y secreto médico',
      }),
    ).toBeInTheDocument();
    // Official contact email and Barquisimeto domicile reach the text with zero placeholders.
    expect(
      screen.getAllByRole('link', { name: 'gerencia@redoctorapp.com' }).length,
    ).toBeGreaterThan(0);

    const text = container.textContent;
    expect(text).not.toMatch(/\[.*\]/);
    expect(text).not.toMatch(/récipes?\s+(médicos?\s+)?digitales?/i);
    expect(text).not.toMatch(/factura fiscal/i);
    expect(text).not.toMatch(/inteligencia artificial/i);
    expect(text).toMatch(/LOPNNA/);
    expect(text).toMatch(/Barquisimeto, Estado Lara/);
    expect(text).toMatch(/forma anónima/);

    expect(
      screen.getByRole('link', { name: 'Términos y condiciones de uso' }),
    ).toHaveAttribute('href', '/terms');
    expect(
      screen.getByRole('link', { name: 'Eliminar mi cuenta' }),
    ).toHaveAttribute('href', '/delete-account');

    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);
});
