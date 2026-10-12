import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { ChoiceCards } from './choice-cards';

const forWhom = [
  { value: 'SELF', label: 'Para mí', description: 'Soy Ana Pérez.' },
  {
    value: 'DEPENDENT',
    label: 'Para un tercero',
    description: 'Ana Pérez está a mi cargo.',
  },
] as const;

describe('ChoiceCards', () => {
  it('is a radio group with nothing chosen until the person chooses', async () => {
    const { container } = render(
      <ChoiceCards
        legend="¿Para quién es esta cita?"
        options={forWhom}
        columns={1}
        inputProps={{ name: 'relationship' }}
      />,
    );

    const group = screen.getByRole('group', {
      name: '¿Para quién es esta cita?',
    });
    expect(group).toBeInTheDocument();
    const mine = screen.getByRole('radio', { name: /Para mí/ });
    expect(mine).not.toBeChecked();

    await userEvent.click(screen.getByText('Para mí'));
    expect(mine).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ties the error to the group', async () => {
    const { container } = render(
      <ChoiceCards
        legend="Sexo"
        options={[
          { value: 'MALE', label: 'Hombre' },
          { value: 'FEMALE', label: 'Mujer' },
        ]}
        inputProps={{ name: 'sex' }}
        error="Este campo es requerido."
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Sexo' }),
    ).toHaveAccessibleDescription('Este campo es requerido.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
