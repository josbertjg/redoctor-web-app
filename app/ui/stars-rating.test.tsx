import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { StarsRating } from './stars-rating';

describe('StarsRating', () => {
  it('reads as one image named by its label', async () => {
    const { container } = render(
      <StarsRating value={4.5} label="4,5 de 5 estrellas" />,
    );

    expect(
      screen.getByRole('img', { name: '4,5 de 5 estrellas' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('draws five stars whatever the value', () => {
    const { container } = render(<StarsRating value={7} label="5 de 5" />);

    expect(container.querySelectorAll('svg')).toHaveLength(5);
  });
});
