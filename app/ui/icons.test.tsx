import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Icon } from './icons';

describe('Icon', () => {
  it('is decorative by default', async () => {
    const { container } = render(<Icon icon={CheckCircle} />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('size-6');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('becomes an image with a name when labelled', async () => {
    const { container } = render(
      <Icon icon={CheckCircle} size={16} label="Cita confirmada" />,
    );
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Cita confirmada');
    expect(svg).toHaveClass('size-4');
    expect(await axe(container)).toHaveNoViolations();
  });
});
