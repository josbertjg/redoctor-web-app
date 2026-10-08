import Verified from '@material-symbols/svg-400/rounded/verified.svg?svgr';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { StateChip } from './state-chip';

describe('StateChip', () => {
  it('is neutral by default', async () => {
    const { container } = render(<StateChip>Pendiente</StateChip>);

    expect(screen.getByText('Pendiente')).toHaveAttribute(
      'data-tone',
      'neutral',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('takes a tone and a decorative icon', async () => {
    const { container } = render(
      <StateChip tone="verified" icon={Verified}>
        Especialista verificado
      </StateChip>,
    );
    const chip = screen.getByText('Especialista verificado');

    expect(chip).toHaveAttribute('data-tone', 'verified');
    expect(chip.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });
});
