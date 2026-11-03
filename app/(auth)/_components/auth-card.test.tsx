import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import { AuthCard } from './auth-card';

describe('AuthCard', () => {
  it('names its region after the title, a level-1 heading by default', async () => {
    const { container } = renderWithIntl(
      <AuthCard
        icon={Login}
        title="Inicia sesión de manera rápida y segura"
        description="Entra con la misma cuenta que usas en la app."
        footer={<p>¿Aún no tienes una cuenta?</p>}
      >
        <button type="button">Continuar con Google</button>
      </AuthCard>,
    );

    expect(
      screen.getByRole('region', {
        name: 'Inicia sesión de manera rápida y segura',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Inicia sesión de manera rápida y segura',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Entra con la misma cuenta que usas en la app.'),
    ).toBeInTheDocument();
    expect(screen.getByText('¿Aún no tienes una cuenta?')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('goes back only when there is a step behind', async () => {
    const onBack = vi.fn();
    const withStep = renderWithIntl(
      <AuthCard icon={Login} title="Crea tu cuenta" onBack={onBack} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledOnce();
    withStep.unmount();

    renderWithIntl(<AuthCard icon={Login} title="Crea tu cuenta" />);
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  });
});
