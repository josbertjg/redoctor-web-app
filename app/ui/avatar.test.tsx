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

  it('sends no referrer so Google-hosted specialist photos are not refused, and tries a new src after an error', () => {
    const { container, rerender } = render(
      <Avatar
        name="Dra. Ana Pérez"
        src="https://lh3.googleusercontent.com/a/photo=s96-c"
        size="3xl"
      />,
    );
    const first = container.querySelector('img');
    expect(first).toHaveAttribute('referrerpolicy', 'no-referrer');

    if (first) fireEvent.error(first);
    expect(container.querySelector('img')).toBeNull();

    rerender(
      <Avatar
        name="Dra. Ana Pérez"
        src="https://firebasestorage.googleapis.com/v0/b/redoctor/o/new.jpg"
        size="3xl"
      />,
    );
    const second = container.querySelector('img');
    expect(second).not.toBeNull();
    if (second) fireEvent.load(second);
    expect(second).toHaveClass('opacity-100');
  });

  it('shows a preloaded SSR photo that finished loading before hydration without waiting for another load event', () => {
    const completeDescriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      'complete',
    );
    const widthDescriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      'naturalWidth',
    );
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get: () => 178,
    });

    try {
      const { container } = render(
        <Avatar
          name="Dra. Ana Pérez"
          src="https://firebasestorage.googleapis.com/v0/b/redoctor/o/a.jpg"
          size="3xl"
          preload
        />,
      );
      expect(container.querySelector('img')).toHaveClass('opacity-100');
    } finally {
      if (completeDescriptor) {
        Object.defineProperty(
          HTMLImageElement.prototype,
          'complete',
          completeDescriptor,
        );
      }
      if (widthDescriptor) {
        Object.defineProperty(
          HTMLImageElement.prototype,
          'naturalWidth',
          widthDescriptor,
        );
      }
    }
  });
});
