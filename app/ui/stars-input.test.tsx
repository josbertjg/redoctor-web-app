import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { StarsInput } from './stars-input';

const starLabel = (stars: number) =>
  stars === 1 ? '1 estrella' : `${String(stars)} estrellas`;

describe('StarsInput', () => {
  it('is a radio group of five stars, none chosen at first', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <StarsInput
        legend="¿Cómo calificarías la cita?"
        inputProps={{ name: 'rating', onChange }}
        starLabel={starLabel}
      />,
    );

    const group = screen.getByRole('group', {
      name: '¿Cómo calificarías la cita?',
    });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(radios.some((radio) => (radio as HTMLInputElement).checked)).toBe(
      false,
    );
    expect(group).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '4 estrellas' }));
    expect(screen.getByRole('radio', { name: '4 estrellas' })).toBeChecked();
    expect(onChange).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('carries the error for the whole group', async () => {
    const { container } = render(
      <StarsInput
        legend="¿Cómo calificarías la cita?"
        inputProps={{ name: 'rating' }}
        starLabel={starLabel}
        error="Toca una estrella para poder continuar."
      />,
    );

    expect(
      screen.getByRole('group', { name: '¿Cómo calificarías la cita?' }),
    ).toHaveAccessibleDescription('Toca una estrella para poder continuar.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
