import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { StoreBadges } from './store-badges';

const labels = {
  appStore: 'Descargar en App Store',
  playStore: 'Descargar en Google Play',
};

describe('StoreBadges', () => {
  it('renders nothing while no listing exists (pilot)', () => {
    const { container } = render(<StoreBadges labels={labels} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('links to each listing that exists', async () => {
    const { container } = render(
      <StoreBadges
        labels={labels}
        appStoreUrl="https://apps.apple.com/app/id1234567890"
        playStoreUrl="https://play.google.com/store/apps/details?id=com.redoctor.mobileapp"
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Descargar en App Store' }),
    ).toHaveAttribute('href', 'https://apps.apple.com/app/id1234567890');
    expect(
      screen.getByRole('link', { name: 'Descargar en Google Play' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
