import SearchOff from '@material-symbols/svg-400/rounded/search_off.svg?svgr';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Button } from './button';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('names its region after the title and shows the help and the action', async () => {
    const { container } = render(
      <EmptyState
        icon={SearchOff}
        title="Este perfil no existe"
        description="Revisa el enlace que te compartieron."
        action={<Button>Ir al inicio</Button>}
      />,
    );

    expect(
      screen.getByRole('region', { name: 'Este perfil no existe' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Revisa el enlace que te compartieron.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ir al inicio' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('uses a level-2 heading by default and level 1 when it is the page', () => {
    const { rerender } = render(<EmptyState title="Sin citas" />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Sin citas' }),
    ).toBeInTheDocument();

    rerender(<EmptyState title="Esta página no existe" headingLevel={1} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Esta página no existe' }),
    ).toBeInTheDocument();
  });

  it('marks the error tone', () => {
    const { container } = render(
      <EmptyState tone="error" title="No pudimos cargar tu cita" />,
    );

    expect(container.querySelector('section')).toHaveAttribute(
      'data-tone',
      'error',
    );
  });
});
