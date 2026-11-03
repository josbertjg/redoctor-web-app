import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { SelectField } from './select-field';

const offices = [
  { value: '', label: 'Todos los consultorios' },
  { value: 'office-1', label: 'Torre Médica' },
  { value: 'office-2', label: 'Clínica Norte' },
];

describe('SelectField', () => {
  it('names the choice by its label and reports the one taken', async () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="Consultorio"
        options={offices}
        value=""
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Consultorio' });
    expect(select).toHaveValue('');
    await userEvent.selectOptions(select, 'office-2');
    expect(onChange).toHaveBeenCalledWith('office-2');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <SelectField label="Consultorio" options={offices} defaultValue="" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('as a pill keeps its name for every reader, its label out of sight', async () => {
    const { container } = render(
      <SelectField
        variant="pill"
        label="Estado de las citas"
        options={offices}
        defaultValue="office-1"
      />,
    );

    const select = screen.getByRole('combobox', {
      name: 'Estado de las citas',
    });
    expect(select).toHaveValue('office-1');
    expect(screen.getByText('Estado de las citas')).toHaveClass('sr-only');
    expect(await axe(container)).toHaveNoViolations();
  });
});
