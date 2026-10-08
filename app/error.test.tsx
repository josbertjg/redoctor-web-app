import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import ErrorPage from './error';

describe('ErrorPage', () => {
  it('explains the failure and retries on demand', async () => {
    const retry = vi.fn();
    const { container } = renderWithIntl(
      <ErrorPage error={new Error('boom')} retry={retry} />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'No pudimos cargar esta página',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('boom')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });
});
