import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  buildMeResponse,
  buildSpecialistMeResponse,
} from '@/tests/factories/identity';
import { specialistSession } from '@/tests/panel';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { BookingAction } from './booking-action';

const bookLabel = 'Agendar cita';
const ownNote = 'Así ven tu perfil tus pacientes.';

function renderAction(
  session: Session,
  { specialistId = 'specialist-1', expectSpecialist = false } = {},
) {
  return render(
    <SessionContext.Provider value={session}>
      <BookingAction
        specialistId={specialistId}
        bookLabel={bookLabel}
        ownNote={ownNote}
        expectSpecialist={expectSpecialist}
      />
    </SessionContext.Provider>,
  );
}

const resolving: Session = {
  ...specialistSession(),
  status: 'resolving',
  user: null,
  account: null,
  accountStatus: 'idle',
};

describe('BookingAction', () => {
  it('offers a patient or a visitor to book, on the booking page', () => {
    renderAction(specialistSession(buildMeResponse()));
    expect(screen.getByRole('link', { name: bookLabel })).toHaveAttribute(
      'href',
      '/book/specialist-1',
    );
  });

  it('never offers a specialist booking: their own profile is how patients see it', () => {
    renderAction(specialistSession(buildSpecialistMeResponse()));
    expect(screen.getByText(ownNote)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says nothing to a specialist on a colleague’s profile', () => {
    const { container } = renderAction(
      specialistSession(buildSpecialistMeResponse()),
      { specialistId: 'someone-else' },
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the button’s place in a specialist’s browser until the session is known', () => {
    const { container } = renderAction(resolving, { expectSpecialist: true });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');

    // Without the hint, booking is offered from the first frame.
    renderAction(resolving);
    expect(screen.getByRole('link', { name: bookLabel })).toBeInTheDocument();
  });
});
