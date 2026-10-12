import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SignInOutcome } from '@/app/lib/firebase/client';

import { renderWithIntl } from '@/tests/render';

import { SignInButtons } from './sign-in-buttons';

const firebase = vi.hoisted(() => ({
  signInWith: vi.fn<() => Promise<SignInOutcome>>(),
}));
vi.mock('@/app/lib/firebase/client', () => ({
  signInWith: firebase.signInWith,
}));

const user = {
  id: 'uid-1',
  email: 'ana@example.com',
  name: 'Ana Pérez',
  photo: null,
  provider: 'google' as const,
  getToken: () => Promise.resolve('token'),
};

const originalUserAgent = navigator.userAgent;

function setUserAgent(value: string) {
  Object.defineProperty(navigator, 'userAgent', {
    value,
    configurable: true,
  });
}

afterEach(() => {
  setUserAgent(originalUserAgent);
  window.localStorage.clear();
});

describe('SignInButtons', () => {
  it('offers Google first, then Apple, and is accessible', async () => {
    const { container } = renderWithIntl(
      <SignInButtons onSignedIn={vi.fn()} />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Continuar con Google',
      'Continuar con Apple',
    ]);
    expect(screen.queryByText('Última vez')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('puts the last-used provider first with its chip', () => {
    window.localStorage.setItem('redoctor-last-provider', 'apple');

    renderWithIntl(<SignInButtons onSignedIn={vi.fn()} />);

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Continuar con Apple', 'Continuar con Google']);
    expect(screen.getByText('Última vez')).toBeInTheDocument();
  });

  it('signs in with the provider tapped, keeps the button busy and remembers it', async () => {
    firebase.signInWith.mockResolvedValue({ status: 'signed-in', user });
    const onSignedIn = vi.fn();
    renderWithIntl(<SignInButtons onSignedIn={onSignedIn} />);

    const google = screen.getByRole('button', { name: 'Continuar con Google' });
    await userEvent.click(google);

    await waitFor(() => {
      expect(onSignedIn).toHaveBeenCalledWith(user, 'google');
    });
    expect(firebase.signInWith).toHaveBeenCalledWith('google');
    expect(google).toHaveAttribute('aria-busy', 'true');
    expect(window.localStorage.getItem('redoctor-last-provider')).toBe(
      'google',
    );
  });

  it('says nothing when the person closes the window', async () => {
    firebase.signInWith.mockResolvedValue({ status: 'cancelled' });
    renderWithIntl(<SignInButtons onSignedIn={vi.fn()} />);

    const apple = screen.getByRole('button', { name: 'Continuar con Apple' });
    await userEvent.click(apple);

    await waitFor(() => {
      expect(apple).not.toHaveAttribute('aria-busy');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('');
  });

  it('says what went wrong under the buttons', async () => {
    firebase.signInWith.mockResolvedValue({
      status: 'failed',
      reason: 'popupBlocked',
    });
    renderWithIntl(<SignInButtons onSignedIn={vi.fn()} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Continuar con Google' }),
    );

    expect(
      await screen.findByText(/bloqueó la ventana para entrar/),
    ).toBeInTheDocument();
  });

  it("explains the way out inside Instagram's browser instead of trying", () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.0.0',
    );

    renderWithIntl(<SignInButtons onSignedIn={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'Abre este enlace en tu navegador' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Instagram abre las páginas/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continuar con Google' }),
    ).not.toBeInTheDocument();
  });
});
