import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import {
  buildMeResponse,
  buildPendingSpecialistMeResponse,
  buildSpecialistMeResponse,
} from '@/tests/factories/identity';
import { specialistSession } from '@/tests/panel';
import { renderWithIntl } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import {
  ProfileStateChip,
  type ProfileStateLabels,
} from './profile-state-chip';

const labels: ProfileStateLabels = {
  active: 'Perfil activo',
  underReview: 'En revisión',
  pendingVerification: 'Registro incompleto',
  inactive: 'Perfil inactivo',
  actionNeeded: 'Acción requerida',
};

function renderChip(session: Session) {
  return renderWithIntl(
    <SessionContext.Provider value={session}>
      <ProfileStateChip labels={labels} />
    </SessionContext.Provider>,
  );
}

const sessionOf = (me: ReturnType<typeof buildSpecialistMeResponse>) =>
  specialistSession(undefined, {
    account: toAccount(meResponseSchema.parse(me)),
  });

describe('ProfileStateChip', () => {
  it('says the profile is active and leads to «Mi perfil»', async () => {
    const { container } = renderChip(specialistSession());

    expect(screen.getByRole('link', { name: 'Perfil activo' })).toHaveAttribute(
      'href',
      '/panel/profile',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says a review is Redoctor’s turn, and an open sign-up the specialist’s', () => {
    const review = renderChip(
      sessionOf(
        buildSpecialistMeResponse({ visibilityStatus: 'SPECIALTIES_PENDING' }),
      ),
    );
    expect(screen.getByRole('link', { name: 'En revisión' })).toBeVisible();
    review.unmount();

    renderChip(sessionOf(buildPendingSpecialistMeResponse()));
    expect(
      screen.getByRole('link', { name: 'Registro incompleto' }),
    ).toBeVisible();
  });

  it('is not there for an admin’s account without the specialist facet', () => {
    const { container } = renderChip(
      sessionOf(
        buildMeResponse({
          role: 'ADMIN',
          profiles: {
            patient: { exists: false },
            specialist: { exists: false },
          },
        }),
      ),
    );

    expect(container).toBeEmptyDOMElement();
  });
});
