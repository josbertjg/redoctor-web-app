import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import { MonthCalendar } from './month-calendar';

describe('MonthCalendar', () => {
  it('as the agenda’s, walks back in time and marks the days with appointments', async () => {
    const onMonthChange = vi.fn();
    const onSelect = vi.fn();
    const { container } = renderWithIntl(
      <MonthCalendar
        variant="agenda"
        month="2026-10"
        today="2026-10-12"
        freeDays={new Set(['2026-10-05', '2026-10-13'])}
        loading={false}
        selected="2026-10-12"
        onMonthChange={onMonthChange}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(onMonthChange).toHaveBeenCalledWith('2026-09');
    expect(
      screen.getByRole('button', {
        name: 'lunes 5 de octubre de 2026, con citas',
      }),
    ).toBeVisible();
    // A day of the past without appointments is a day like any other.
    await userEvent.click(
      screen.getByRole('button', { name: 'jueves 1 de octubre de 2026' }),
    );
    expect(onSelect).toHaveBeenCalledWith('2026-10-01');
    expect(
      screen.getByRole('button', { name: 'lunes 12 de octubre de 2026' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });
});
