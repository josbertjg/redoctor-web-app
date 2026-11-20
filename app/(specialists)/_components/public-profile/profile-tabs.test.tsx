import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { ProfileTabs } from './profile-tabs';

const sections = [
  { id: 'descripcion', title: 'Descripción' },
  { id: 'opiniones', title: 'Opiniones' },
  { id: 'sobre-el-especialista', title: 'Sobre este especialista' },
] as const;

describe('ProfileTabs', () => {
  it('takes the page to each section and marks the one chosen', async () => {
    const { container } = render(
      <ProfileTabs label="Secciones del perfil" sections={sections} />,
    );

    const nav = screen.getByRole('navigation', {
      name: 'Secciones del perfil',
    });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Opiniones' })).toHaveAttribute(
      'href',
      '#opiniones',
    );
    // The first section is the one in view at first.
    expect(screen.getByRole('link', { name: 'Descripción' })).toHaveAttribute(
      'aria-current',
      'location',
    );

    await userEvent.click(
      screen.getByRole('link', { name: 'Sobre este especialista' }),
    );
    expect(
      screen.getByRole('link', { name: 'Sobre este especialista' }),
    ).toHaveAttribute('aria-current', 'location');
    expect(
      screen.getByRole('link', { name: 'Descripción' }),
    ).not.toHaveAttribute('aria-current');
    expect(await axe(container)).toHaveNoViolations();
  });
});
