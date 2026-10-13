import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import HomePage from './page';

// The splash has played this session: the page is the landing alone.
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ has: () => true }),
  headers: () => Promise.resolve(new Headers()),
}));

const renderHome = async () => renderWithIntl(await HomePage());

describe('HomePage', () => {
  it('renders the landing without accessibility violations', async () => {
    const { container } = await renderHome();

    expect(
      screen.getByRole('heading', { level: 1, name: /en un solo click\./ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('search', { name: 'Buscar especialistas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Así de simple.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Elige el plan ideal' }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-splash]')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);

  it('unfolds the menu on small screens and folds it on a choice', async () => {
    await renderHome();

    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir el menú' }),
    );
    const close = screen.getByRole('button', { name: 'Cerrar el menú' });
    expect(close).toHaveAttribute('aria-expanded', 'true');

    // The desktop links are only hidden by CSS: the unfolded menu's come last.
    const menuLink = screen.getAllByRole('link', { name: 'Planes' }).at(-1);
    if (!menuLink) throw new Error('The menu has no links');

    await userEvent.click(menuLink);
    expect(
      screen.getByRole('button', { name: 'Abrir el menú' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('answers one question at a time', async () => {
    await renderHome();

    const first = screen.getByRole('button', {
      name: '¿Tengo que descargar una app?',
    });
    const second = screen.getByRole('button', { name: '¿Cuánto cuesta?' });
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(second).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(second);

    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByText(/Redoctor es gratis para los pacientes/),
    ).toBeVisible();
  });
});
