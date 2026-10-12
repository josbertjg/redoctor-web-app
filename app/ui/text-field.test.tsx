import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Checkbox } from './checkbox';
import { TextField } from './text-field';

describe('TextField', () => {
  it('labels its input and is accessible', async () => {
    const { container } = render(
      <TextField label="Nombre" name="firstName" placeholder="Ana" />,
    );

    const input = screen.getByRole('textbox', { name: 'Nombre' });
    await userEvent.type(input, 'Ana');
    expect(input).toHaveValue('Ana');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says what is wrong under the field and ties it to the input', async () => {
    const { container, rerender } = render(
      <TextField label="Nombre" error="Este campo es requerido." />,
    );

    const input = screen.getByRole('textbox', { name: 'Nombre' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Este campo es requerido.');
    expect(await axe(container)).toHaveNoViolations();

    // Fixed: the line folds away keeping its words until it is gone.
    rerender(<TextField label="Nombre" />);
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Este campo es requerido.')).toBeInTheDocument();
  });

  it('carries a prefix inside the box', () => {
    render(
      <TextField
        label="Teléfono"
        type="tel"
        leading={<span className="pl-3">+58</span>}
      />,
    );

    expect(screen.getByText('+58')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Teléfono' })).toHaveAttribute(
      'type',
      'tel',
    );
  });
});

describe('Checkbox', () => {
  it('toggles from its label and is accessible', async () => {
    const { container } = render(
      <Checkbox label="Quiero recibir novedades" name="newsletter" />,
    );

    const checkbox = screen.getByRole('checkbox', {
      name: 'Quiero recibir novedades',
    });
    await userEvent.click(screen.getByText('Quiero recibir novedades'));
    expect(checkbox).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says why it is needed', async () => {
    const { container } = render(
      <Checkbox
        label="Acepto los términos"
        error="Debes aceptar para continuar."
      />,
    );

    expect(
      screen.getByRole('checkbox', { name: 'Acepto los términos' }),
    ).toHaveAccessibleDescription('Debes aceptar para continuar.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
