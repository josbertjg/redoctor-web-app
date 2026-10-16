import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CountBadge } from './count-badge';

const badge = (container: HTMLElement) =>
  container.querySelector('[data-slot="count-badge"]');

describe('CountBadge', () => {
  it('shows the count, hidden from assistive technology', () => {
    const { container } = render(<CountBadge count={3} />);

    expect(badge(container)).toHaveTextContent('3');
    expect(badge(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('caps the count', () => {
    const { container } = render(<CountBadge count={120} />);

    expect(badge(container)).toHaveTextContent('99+');
  });

  it('is not there without a count', () => {
    const { container } = render(<CountBadge count={0} />);

    expect(badge(container)).toBeNull();
  });

  it('keeps the last count while it leaves, then goes, and comes back with a new one', () => {
    const { container, rerender } = render(<CountBadge count={2} />);

    rerender(<CountBadge count={0} />);
    const leaving = badge(container);
    expect(leaving).toHaveTextContent('2');
    expect(leaving).toHaveAttribute('data-leaving');

    if (!leaving) throw new Error('the badge should still be there');
    fireEvent.animationEnd(leaving);
    expect(badge(container)).toBeNull();

    rerender(<CountBadge count={5} />);
    expect(badge(container)).toHaveTextContent('5');
    expect(badge(container)).not.toHaveAttribute('data-leaving');
  });
});
