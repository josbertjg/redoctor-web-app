import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('is hidden from assistive technology and takes the given size', async () => {
    const { container } = render(<Skeleton className="h-10 w-40" />);
    const skeleton = container.querySelector('[data-slot="skeleton"]');

    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveClass('h-10', 'w-40', 'animate-pulse');
    expect(await axe(container)).toHaveNoViolations();
  });
});
