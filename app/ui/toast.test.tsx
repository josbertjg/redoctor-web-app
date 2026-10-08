import { act, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { toast, Toaster } from './toast';

describe('Toaster', () => {
  it('announces a toast with a localized close button', async () => {
    const { container } = render(
      <Toaster regionLabel="Notificaciones" closeLabel="Cerrar" />,
    );

    act(() => {
      toast.success('Cita confirmada', {
        description: 'Te esperamos el jueves a las 3:00 p. m.',
      });
    });

    expect(await screen.findByText('Cita confirmada')).toBeInTheDocument();
    expect(
      screen.getByText('Te esperamos el jueves a las 3:00 p. m.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /Notificaciones/ }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
