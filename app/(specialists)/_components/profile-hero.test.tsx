import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import {
  buildPublicProfileResponse,
  buildSpecialistProfile,
} from '@/tests/factories/specialists';
import { renderWithIntl } from '@/tests/render';

import { ProfileHero } from './profile-hero';

describe('ProfileHero', () => {
  it('shows who the specialist is, as the app header does', async () => {
    const { container } = renderWithIntl(
      <ProfileHero profile={buildSpecialistProfile()} />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ana Pérez' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Especialista verificado' }),
    ).toBeInTheDocument();
    // Only the verified specialty, never the one under review.
    expect(screen.getByText('Medicina Interna')).toBeInTheDocument();
    expect(screen.queryByText(/Cardiología/)).toBe(null);
    expect(
      screen.getByRole('link', { name: 'Clínica El Ávila' }),
    ).toHaveAttribute('href', '#consultorios');
    expect(
      screen.getByRole('img', { name: '4,5 de 5 estrellas' }),
    ).toBeInTheDocument();
    expect(screen.getByText('(2 reseñas)')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says «y N más» when there are more specialties and offices', () => {
    const response = buildPublicProfileResponse();
    const [office] = response.offices;
    if (!office) throw new Error('The factory has an office');
    const profile = buildSpecialistProfile({
      ...response,
      specialties: response.specialties.map((specialty) => ({
        ...specialty,
        isVerified: true,
      })),
      offices: [office, { ...office, id: 'second', name: 'Torre Sur' }],
    });
    renderWithIntl(<ProfileHero profile={profile} />);

    expect(screen.getByText(/Medicina Interna y 1 más/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Clínica El Ávila y 1 más' }),
    ).toBeInTheDocument();
  });

  it('shows the verified pill instead of the rating before any review', () => {
    const profile = buildSpecialistProfile(
      buildPublicProfileResponse({ rating: { average: null, count: 0 } }),
    );
    renderWithIntl(<ProfileHero profile={profile} />);

    expect(screen.getByText('Especialista verificado')).toBeInTheDocument();
    expect(screen.queryByText(/reseña/)).toBe(null);
  });
});
