import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import HomePage from './page';

describe('HomePage', () => {
  it('renders the provisional cover without accessibility violations', async () => {
    const { container } = renderWithIntl(<HomePage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Especialistas verificados. Citas sin enredos.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Redoctor' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
