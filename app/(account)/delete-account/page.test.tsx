import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import DeleteAccountPage from './page';

// The page's client part is a flow of its own (delete-account-flow.test.tsx);
// its messages scope is a server component this render does not run.
vi.mock('@/app/ui/messages-scope', () => ({
  MessagesScope: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../_components/delete-account-flow', () => ({
  DeleteAccountFlow: ({ words }: { words: { title: string } }) => (
    <section aria-label={words.title} />
  ),
}));

describe('DeleteAccountPage', () => {
  it('lets the person delete the account here, and says how it goes and what happens', async () => {
    const { container } = renderWithIntl(
      // A server page: it reads the support lines before it renders.
      await DeleteAccountPage(),
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Eliminar mi cuenta' }),
    ).toBeInTheDocument();
    // The deletion itself, right after the introduction.
    expect(
      screen.getByRole('region', { name: 'Tu cuenta' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Contenido' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Cómo eliminarla' }),
    ).toBeInTheDocument();
    // Whoever cannot sign in still has support.
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
