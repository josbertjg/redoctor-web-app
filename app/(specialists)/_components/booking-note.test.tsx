import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  buildMeResponse,
  buildSpecialistMeResponse,
} from '@/tests/factories/identity';
import { specialistSession } from '@/tests/panel';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { BookingNote } from './booking-note';

const patientNote =
  'Pronto podrás agendar aquí; por ahora pídele tu cita a tu especialista.';
const ownNote = 'Así ven tu perfil tus pacientes.';

function renderNote(
  session: Session,
  { specialistId = 'specialist-1', expectSpecialist = false } = {},
) {
  return render(
    <SessionContext.Provider value={session}>
      <BookingNote
        specialistId={specialistId}
        patientNote={patientNote}
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

describe('BookingNote', () => {
  it('tells a patient or a visitor that booking is coming', () => {
    renderNote(specialistSession(buildMeResponse()));
    expect(screen.getByText(patientNote)).toBeInTheDocument();
  });

  it('never offers a specialist booking: their own profile is how patients see it', () => {
    renderNote(specialistSession(buildSpecialistMeResponse()));
    expect(screen.getByText(ownNote)).toBeInTheDocument();
    expect(screen.queryByText(patientNote)).not.toBeInTheDocument();
  });

  it('says nothing to a specialist on a colleague’s profile', () => {
    const { container } = renderNote(
      specialistSession(buildSpecialistMeResponse()),
      { specialistId: 'someone-else' },
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('waits for the session in a specialist’s browser, instead of the patients’ line', () => {
    renderNote(resolving, { expectSpecialist: true });
    expect(screen.queryByText(patientNote)).not.toBeInTheDocument();

    renderNote(resolving);
    expect(screen.getByText(patientNote)).toBeInTheDocument();
  });
});
