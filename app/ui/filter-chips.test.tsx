import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { FilterChips } from './filter-chips';

const options = [
  { key: 'all', value: null, label: 'Todos' },
  { key: 'open', value: 'open', label: 'Por pagar' },
  { key: 'paid', value: 'paid', label: 'Pagados' },
] as const;

describe('FilterChips', () => {
  it('is a group of radios named by its legend, the current one checked', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <FilterChips
        legend="Filtrar por estado"
        options={options}
        value="open"
        onChange={onChange}
      />,
    );

    const group = screen.getByRole('group', { name: 'Filtrar por estado' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Por pagar' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Todos' })).not.toBeChecked();

    await userEvent.click(screen.getByText('Pagados'));
    expect(onChange).toHaveBeenCalledWith('paid');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps the legend for screen readers alone when asked', () => {
    render(
      <FilterChips
        legend="Filtrar por estado"
        hideLegend
        options={options}
        value={null}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Filtrar por estado')).toHaveClass('sr-only');
    expect(screen.getByRole('radio', { name: 'Todos' })).toBeChecked();
  });
});
