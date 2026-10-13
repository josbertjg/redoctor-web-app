import { useState } from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import { Button } from './button';
import { Sheet } from './sheet';

function renderSheet(onOpenChange = vi.fn()) {
  renderWithIntl(
    <Sheet
      open
      onOpenChange={onOpenChange}
      title="¿Cancelar esta cita?"
      description="Esta acción no se puede deshacer."
      footer={<Button block>Cancelar cita</Button>}
    >
      <p>Tu cita con Dra. María González será cancelada.</p>
    </Sheet>,
  );
  return onOpenChange;
}

describe('Sheet', () => {
  it('is a labelled dialog with its body and its action', async () => {
    renderSheet();

    const dialog = screen.getByRole('dialog', { name: '¿Cancelar esta cita?' });
    expect(dialog).toHaveAccessibleDescription(
      'Esta acción no se puede deshacer.',
    );
    expect(
      screen.getByText('Tu cita con Dra. María González será cancelada.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar cita' }),
    ).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('closes with its button and with Escape', async () => {
    const onOpenChange = renderSheet();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('gives the focus back to the button that opened it', async () => {
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button
            onClick={() => {
              setOpen(true);
            }}
          >
            Cancelar
          </Button>
          <Sheet
            open={open}
            onOpenChange={setOpen}
            title="¿Cancelar esta cita?"
          >
            <p>Tu cita será cancelada.</p>
          </Sheet>
        </>
      );
    }
    renderWithIntl(<Opener />);
    const opener = screen.getByRole('button', { name: 'Cancelar' });

    await userEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });
});
