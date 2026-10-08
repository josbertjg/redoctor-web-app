import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Avatar } from './avatar';

describe('Avatar', () => {
  it('shows the initials and is named after the person', async () => {
    const { container } = render(<Avatar name="Josbert Guedez" />);

    expect(
      screen.getByRole('img', { name: 'Josbert Guedez' }),
    ).toHaveTextContent('JG');
    expect(container.querySelector('img')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('fades the photo in once it loads and keeps the initials beneath', async () => {
    const { container } = render(
      <Avatar
        name="Josbert Guedez"
        src="https://example.com/photo.jpg"
        size="lg"
      />,
    );
    const photo = container.querySelector('img');

    expect(photo).toHaveClass('opacity-0');
    if (photo) fireEvent.load(photo);
    expect(photo).toHaveClass('opacity-100');
    expect(screen.getByRole('img', { name: 'Josbert Guedez' })).toHaveAttribute(
      'data-size',
      'lg',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('falls back to the initials when the photo fails', () => {
    const { container } = render(
      <Avatar name="Josbert Guedez" src="https://example.com/missing.jpg" />,
    );
    const photo = container.querySelector('img');

    if (photo) fireEvent.error(photo);

    expect(container.querySelector('img')).toBeNull();
    expect(
      screen.getByRole('img', { name: 'Josbert Guedez' }),
    ).toHaveTextContent('JG');
  });
});
