import { screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { searchResponseSchema, toSearchPage } from '@/app/lib/schemas/search';

import {
  buildSearchResponse,
  buildSearchResult,
  searchIds,
} from '@/tests/factories/search';
import { renderWithIntl } from '@/tests/render';

import { SpecialistCard } from './specialist-card';

const specialist = (
  overrides: Parameters<typeof buildSearchResult>[0] = {},
) => {
  const page = toSearchPage(
    searchResponseSchema.parse(
      buildSearchResponse({ data: [buildSearchResult(overrides)] }),
    ),
  );
  const first = page.results[0];
  if (!first) throw new Error('The factory always answers one specialist.');
  return first;
};

describe('SpecialistCard', () => {
  it('opens the profile from its name, under the heading level its list asks for', async () => {
    const { container } = renderWithIntl(
      <ul>
        <li>
          <SpecialistCard specialist={specialist()} headingLevel={3} />
        </li>
      </ul>,
    );

    const card = screen.getByRole('article', { name: 'Ana Pérez' });
    expect(
      within(card).getByRole('heading', { level: 3, name: /^Ana Pérez/ }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: 'Ana Pérez' }),
    ).toHaveAttribute('href', `/s/${searchIds.specialist}`);
    expect(within(card).getByText(/a 3,2 km/)).toBeInTheDocument();
    expect(
      within(card).getByRole('link', {
        name: 'Agendar con Ana Pérez el jueves 15 de octubre de 2026',
      }),
    ).toHaveAttribute(
      'href',
      `/book/${searchIds.specialist}?office=${searchIds.office}&date=2026-10-15`,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says no distance when the list was asked without a point', () => {
    renderWithIntl(
      <SpecialistCard
        specialist={specialist({
          nearestOffice: {
            ...buildSearchResult().nearestOffice,
            distanceMeters: null,
          },
        })}
      />,
    );

    const card = screen.getByRole('article', { name: 'Ana Pérez' });
    expect(within(card).getByText('Clínica El Ávila')).toBeInTheDocument();
    expect(within(card).queryByText(/km/)).not.toBeInTheDocument();
    expect(
      within(card).getByRole('heading', { level: 2, name: /^Ana Pérez/ }),
    ).toBeInTheDocument();
  });
});
