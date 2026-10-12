import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import { InAppBrowserHelp } from './in-app-browser-help';

describe('InAppBrowserHelp', () => {
  it('names the app, explains the steps and is accessible', async () => {
    const { container } = renderWithIntl(<InAppBrowserHelp app="facebook" />);

    expect(
      screen.getByRole('heading', { name: 'Abre este enlace en tu navegador' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Facebook abre las páginas/)).toBeInTheDocument();
    expect(
      screen.getByText(/Toca el menú de los tres puntos/),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('copies the page address', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderWithIntl(<InAppBrowserHelp app="webview" />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Copiar enlace' }),
    );

    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });
});
