import { screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('renders the policy, its contents and the links to the other legal pages', async () => {
    const { container } = renderWithIntl(<PrivacyPage />);

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
    // The company's identification reaches the text as values.
    expect(
      screen.getAllByText(/\[Razón social de Redoctor\]/).length,
    ).toBeGreaterThan(0);

    expect(
      screen.getByRole('link', { name: 'Términos y condiciones de uso' }),
    ).toHaveAttribute('href', '/terms');
    expect(
      screen.getByRole('link', { name: 'Eliminar mi cuenta' }),
    ).toHaveAttribute('href', '/delete-account');

    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);
});
