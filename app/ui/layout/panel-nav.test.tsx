import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { buildMeResponse } from '@/tests/factories/identity';
import { specialistSession } from '@/tests/panel';
import { renderWithPageMessages } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { PanelNav } from './panel-nav';

const location = vi.hoisted(() => ({ pathname: '/panel' }));
vi.mock('next/navigation', () => ({
  usePathname: () => location.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

function renderNav(pathname: string, session: Session = specialistSession()) {
  location.pathname = pathname;
  return renderWithPageMessages(
    <SessionContext.Provider value={session}>
      <PanelNav />
    </SessionContext.Provider>,
    ['panel'],
  );
}

describe('PanelNav', () => {
  it('names the panel’s sections and marks the one on screen', async () => {
    const { container } = renderNav('/panel/agenda/2026-10-14');

    const nav = screen.getByRole('navigation', { name: 'Tu panel' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'href',
      '/panel',
    );
    expect(screen.getByRole('link', { name: 'Citas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Estadísticas' })).toHaveAttribute(
      'href',
      '/panel/reports',
    );
    expect(
      screen.getByRole('link', { name: 'Suscripción' }),
    ).not.toHaveAttribute('aria-current');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('puts the mark under the section on screen alone, and none on a page of no section', () => {
    // The mark is what slides to the next section in a page transition.
    const reports = renderNav('/panel/reports');
    const marks = reports.container.querySelectorAll('.vt-panel-nav-pill');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.parentElement).toContainElement(
      screen.getByRole('link', { name: 'Estadísticas' }),
    );
    reports.unmount();

    const profile = renderNav('/panel/profile');
    expect(
      profile.container.querySelectorAll('.vt-panel-nav-pill'),
    ).toHaveLength(0);
  });

  it('keeps the subscription marked on its payment page', () => {
    renderNav('/pay');

    expect(screen.getByRole('link', { name: 'Suscripción' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('is not there for an admin’s account without the specialist facet', () => {
    renderNav(
      '/panel',
      specialistSession(undefined, {
        account: toAccount(
          meResponseSchema.parse(
            buildMeResponse({
              role: 'ADMIN',
              profiles: {
                patient: { exists: false },
                specialist: { exists: false },
              },
            }),
          ),
        ),
      }),
    );

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
