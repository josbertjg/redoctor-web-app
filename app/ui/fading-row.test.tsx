import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { FadingRow } from './fading-row';

describe('FadingRow', () => {
  it('keeps what it is given and fades no side until it measures one', async () => {
    const { container } = render(
      <FadingRow role="group" aria-label="Próximos días" className="flex">
        <button type="button">Lun 16</button>
        <button type="button">Más fechas</button>
      </FadingRow>,
    );

    const row = screen.getByRole('group', { name: 'Próximos días' });
    expect(row).toHaveClass('flex');
    expect(row).toHaveAttribute('data-fade', 'none');
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });
});
