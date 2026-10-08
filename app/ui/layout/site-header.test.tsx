import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  it('links the logo home with an accessible name', async () => {
    const { container } = render(
      <SiteHeader homeLabel="Redoctor, ir al inicio">
        <button type="button">Abrir en la app</button>
      </SiteHeader>,
    );

    expect(
      screen.getByRole('link', { name: 'Redoctor, ir al inicio' }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('button', { name: 'Abrir en la app' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
