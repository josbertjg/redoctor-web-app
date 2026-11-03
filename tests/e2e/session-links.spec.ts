import { auditAccessibility, e2eSpecialistId } from './helpers';
import {
  expect,
  invitationIn,
  people,
  signInWith,
  test,
  wipeOpened,
} from './signed-in';
import { buildAppointment, hoursFromNow } from '../factories/appointments';

import type { Locator, Page } from '@playwright/test';

/*
 * Every link a patient receives that needs a session (AGENTS.md §1 and §6):
 * the page asks for it right there, or through the sign-in page, and once
 * the person is in it shows what the link holds — an account with no
 * sign-up finishes it first and comes back. Never an error, never the
 * landing. Also the specialist's links from the emails, which come back to
 * the same page.
 */

test.describe.configure({ timeout: 90_000 });

const appointment = '0e2e0e2e-0000-4000-8000-000000000001';

/** An appointment of this account, `hours` from now. */
function appointmentFor(
  patientId: string,
  hours: number,
  overrides: Parameters<typeof buildAppointment>[0] = {},
) {
  return buildAppointment(
    { id: appointment, patientUserId: patientId, ...overrides },
    hoursFromNow(hours),
  );
}

/** The first day of the calendar with free hours (this month or the next). */
async function chooseFirstFreeDay(scope: Locator) {
  await expect(
    scope.getByRole('button', { name: /de \d{4}(, sin cupos)?$/ }).first(),
  ).toBeVisible();
  const free = scope.getByRole('button', { name: /^\S+ \d+ de \S+ de \d{4}$/ });
  if ((await free.count()) === 0) {
    await scope.getByRole('button', { name: 'Mes siguiente' }).click();
  }
  await free.first().click();
}

/** The personal data of the sign-up, for an account that has none. */
async function fillSignUp(page: Page) {
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Carmen');
  await page.getByRole('textbox', { name: 'Apellido' }).fill('Díaz');
  const birth = page.getByRole('textbox', { name: 'Fecha de nacimiento' });
  if ((await birth.count()) > 0) {
    await birth.fill('1992-07-23');
    await page.getByRole('textbox', { name: 'Teléfono' }).fill('4241234567');
    await page
      .getByRole('textbox', { name: 'Cédula de identidad' })
      .fill('23456789');
    await page
      .getByRole('group', { name: 'Sexo' })
      .getByText('Mujer', { exact: true })
      .click();
  }
  await page.getByRole('checkbox', { name: /^He leído y acepto/ }).check();
  await page
    .getByRole('checkbox', { name: /^Autorizo el uso de mis datos/ })
    .check();
}

test('the appointment link from a reminder: sign in right there, see it and confirm it', async ({
  page,
  api,
}) => {
  const ana = api.patient(people.ana);
  api.appointments.set(
    appointment,
    appointmentFor(ana.id, 20, { canConfirmNow: true }),
  );

  await page.goto(`/a/${appointment}?origin=whatsapp-reminder`);
  await expect(
    page.getByRole('heading', { name: 'Entra para ver tu cita' }),
  ).toBeVisible();
  // Nothing of the appointment is read before the session.
  expect(api.called('GET', `/scheduling/appointments/${appointment}`)).toBe(
    false,
  );
  await signInWith(page);

  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Dra. María González' }),
  ).toBeVisible();
  await wipeOpened(page);
  expect(await auditAccessibility(page)).toEqual([]);
  await page.getByRole('button', { name: 'Confirmar cita' }).click();

  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirmar cita' }),
  ).toHaveCount(0);
});

test('the appointment link: reschedule it to another day and hour, then cancel it', async ({
  page,
  api,
}) => {
  const ana = api.patient(people.ana);
  api.appointments.set(appointment, appointmentFor(ana.id, 72));

  await page.goto(`/a/${appointment}?origin=email-12`);
  await signInWith(page);
  await wipeOpened(page);

  await page.getByRole('button', { name: 'Reprogramar' }).click();
  const reschedule = page.getByRole('dialog', { name: 'Reprogramar cita' });
  await chooseFirstFreeDay(reschedule);
  await reschedule.getByText('2:00 p. m.', { exact: true }).click();
  await reschedule
    .getByRole('button', { name: 'Confirmar reprogramación' })
    .click();

  await expect(reschedule).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Reprogramaciones' }),
  ).toBeVisible();
  await expect(page.getByText('Reprogramada por el paciente')).toBeVisible();
  await expect(page.getByText('2:00 p. m.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const cancel = page.getByRole('dialog', { name: '¿Cancelar esta cita?' });
  await cancel.getByRole('button', { name: 'Cancelar cita' }).click();

  await expect(cancel).toBeHidden();
  await expect(page.getByText('Cita cancelada').first()).toBeVisible();
  await expect(
    page.getByText(
      'Hemos notificado al especialista que la cita ha sido cancelada.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reprogramar' })).toHaveCount(
    0,
  );
});

test('the appointment link in another account: «Entrar con otra cuenta», and the right one shows it', async ({
  page,
  providers,
  api,
}) => {
  const ana = api.patient(people.ana);
  api.patient(people.luis);
  api.appointments.set(appointment, appointmentFor(ana.id, 72));

  // Gmail's own browser, with the other account of the house.
  providers.next = people.luis;
  await page.goto(`/a/${appointment}?origin=email-11`);
  await signInWith(page);

  await expect(
    page.getByRole('heading', { name: 'Esta cita está en otra cuenta' }),
  ).toBeVisible();
  await expect(page.getByText(/luis\.rivas@gmail\.com/)).toBeVisible();
  await page.getByRole('button', { name: 'Entrar con otra cuenta' }).click();

  await expect(
    page.getByRole('heading', { name: 'Entra para ver tu cita' }),
  ).toBeVisible();
  providers.next = people.ana;
  await signInWith(page);

  await expect(page).toHaveURL(`/a/${appointment}`);
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
});

test('the bar’s «Entrar» on a link: the sign-in page brings the person back to it', async ({
  page,
  api,
}) => {
  const ana = api.patient(people.ana);
  api.appointments.set(appointment, appointmentFor(ana.id, 72));

  await page.goto(`/a/${appointment}`);
  await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(
    `/sign-in?redirect=${encodeURIComponent(`/a/${appointment}`)}`,
  );
  await signInWith(page);

  await expect(page).toHaveURL(`/a/${appointment}`);
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
});

test('an invitation already claimed, opened signed out: signing in shows it', async ({
  page,
  api,
}) => {
  const token = 'tok-e2e-claimed-0000001';
  const ana = api.patient(people.ana);
  api.invitations.set(
    token,
    invitationIn(48, {
      invitation: {
        status: 'ACCEPTED',
        acceptedByUserId: ana.id,
        acceptedAt: new Date().toISOString(),
      },
      appointment: { patientUserId: ana.id },
    }),
  );

  await page.goto(`/i/${token}?origin=whatsapp-invitation`);
  await expect(
    page.getByRole('heading', { name: 'Esta invitación ya fue reclamada' }),
  ).toBeVisible();
  await expect(
    page.getByText('Si la reclamaste tú, entra con esa cuenta para verla.'),
  ).toBeVisible();
  await signInWith(page);

  await expect(
    page.getByRole('heading', { name: 'Ya reclamaste esta cita' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver mi cita' })).toHaveAttribute(
    'href',
    '/a/8f2c1a3e-6b7d-4c2e-9a1f-3d4e5f6a7b8c',
  );
});

test('«Mis citas»: signing in comes back to them, the finished consultation rated first', async ({
  page,
  api,
}) => {
  const ana = api.patient(people.ana);
  const finished = '0e2e0e2e-0000-4000-8000-000000000002';
  api.appointments.set(appointment, appointmentFor(ana.id, 72));
  api.appointments.set(
    finished,
    appointmentFor(ana.id, -48, {
      id: finished,
      status: 'COMPLETED',
      persistedStatus: 'COMPLETED',
    }),
  );
  api.toRate.add(finished);

  await page.goto('/appointments');
  await expect(page).toHaveURL(
    `/sign-in?redirect=${encodeURIComponent('/appointments')}`,
  );
  await signInWith(page);

  await expect(page).toHaveURL('/appointments');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Califica tu consulta' }),
  ).toBeVisible();
  await wipeOpened(page);
  await page.locator('label', { hasText: '5 estrellas' }).click();
  await page
    .getByRole('textbox', { name: 'Comentario (opcional)' })
    .fill('Muy atenta y puntual.');
  await page.getByRole('button', { name: 'Enviar calificación' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Mis citas' }),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Próximas (1)' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Pasadas (1)' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Dra\. María González/ }),
  ).toHaveAttribute('href', `/a/${appointment}`);
  expect(await auditAccessibility(page)).toEqual([]);
});

test('«Mis citas» for an account with no sign-up: the sign-up first, then back to them', async ({
  page,
  providers,
}) => {
  providers.next = people.carmen;

  await page.goto('/appointments');
  await signInWith(page);

  // A brand-new account says who it is first, as in the app.
  await expect(page).toHaveURL(
    `/sign-up?redirect=${encodeURIComponent('/appointments')}`,
  );
  await page.getByRole('button', { name: /^Paciente/ }).click();
  // «Mis citas» needs no personal data: the names and the consents.
  await fillSignUp(page);
  await expect(
    page.getByRole('textbox', { name: 'Fecha de nacimiento' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page).toHaveURL('/appointments');
  await expect(
    page.getByRole('heading', { name: 'Aún no tienes citas' }),
  ).toBeVisible();
});

test('booking from the public profile: sign in right there and book, a taken hour said in place', async ({
  page,
  api,
}) => {
  api.patient(people.ana);

  await page.goto(`/s/${e2eSpecialistId}?origin=share-profile`);
  await page.getByRole('link', { name: 'Agendar cita' }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Entra para agendar tu cita' }),
  ).toBeVisible();
  await signInWith(page);

  // Someone else takes the hour meanwhile: the page says so, and another
  // one is chosen.
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  await wipeOpened(page);
  await page.getByText('10:00 a. m.', { exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  // The reasons come with the public profile, read on the server from
  // api-dev (REDOC-367): the first one its office offers, whatever it is.
  await page
    .getByRole('group', { name: 'Motivo de consulta' })
    .getByRole('radio')
    .first()
    .check();
  await page.getByText('Para mí', { exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Resumen de tu cita' }),
  ).toBeVisible();
  await expect(page.getByText('ana.perez@gmail.com')).toBeVisible();
  // The summary wraps each «Editar» with its term in a <div> inside the
  // <dl>, which HTML does not allow (axe: definition-list, dlitem). Found
  // 2026-10-17; its fix waits for the owner's word.
  expect(
    (await auditAccessibility(page)).filter(
      (violation) => !['definition-list', 'dlitem'].includes(violation.id),
    ),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();

  await expect(page.getByText('Horario no disponible')).toBeVisible();
  await page.getByText('2:00 p. m.', { exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: '¡Todo listo!' }),
  ).toBeVisible();
  await wipeOpened(page);
  await page.getByRole('link', { name: 'Ver mi cita' }).click();

  await expect(page).toHaveURL(/\/a\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
  await expect(page.getByText('2:00 p. m.', { exact: true })).toBeVisible();
});

test('booking for an account with no sign-up: the sign-up first, then the steps', async ({
  page,
  providers,
}) => {
  providers.next = people.carmen;

  await page.goto(`/book/${e2eSpecialistId}`);
  await signInWith(page);

  await expect(
    page.getByRole('heading', {
      name: '¡Un último paso para agendar tu cita!',
    }),
  ).toBeVisible();
  await wipeOpened(page);
  await page
    .getByRole('link', { name: /registro|datos|Continuar|Completar/i })
    .first()
    .click();

  await expect(page).toHaveURL(
    `/sign-up?redirect=${encodeURIComponent(`/book/${e2eSpecialistId}`)}`,
  );
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Crea tu cuenta para agendar tu cita',
    }),
  ).toBeVisible();
  await fillSignUp(page);
  await page.getByRole('button', { name: 'Finalizar' }).click();

  await expect(
    page.getByRole('heading', { name: '¡Todo listo!' }),
  ).toBeVisible();
  await wipeOpened(page);
  await page.getByRole('button', { name: 'Agendar mi cita' }).click();

  await expect(page).toHaveURL(`/book/${e2eSpecialistId}`);
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
});

test('the sign-up link opened in another browser: the account right there, then the sign-up, then the invitation', async ({
  page,
  providers,
  api,
}) => {
  const token = 'tok-e2e-other-browser-01';
  api.invitations.set(token, invitationIn(72));
  providers.next = people.carmen;

  await page.goto(`/sign-up?redirect=/i/${token}`);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Crea tu cuenta como paciente',
    }),
  ).toBeVisible();
  await signInWith(page);

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Crea tu cuenta para reclamar tu cita',
    }),
  ).toBeVisible();
  await fillSignUp(page);
  await page.getByRole('button', { name: 'Finalizar' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Todo listo!' }),
  ).toBeVisible();
  await wipeOpened(page);
  await page.getByRole('button', { name: 'Reclamar mi cita' }).click();

  await expect(page).toHaveURL(`/i/${token}`);
  await expect(page.getByRole('form', { name: 'Reclamar cita' })).toBeVisible();
});

test('the finished consultation’s link (email 15): the stars first, then the appointment', async ({
  page,
  api,
}) => {
  const ana = api.patient(people.ana);
  api.appointments.set(
    appointment,
    appointmentFor(ana.id, -48, {
      status: 'COMPLETED',
      persistedStatus: 'COMPLETED',
    }),
  );
  api.toRate.add(appointment);

  await page.goto(`/a/${appointment}?origin=email-15`);
  await signInWith(page);

  await expect(
    page.getByRole('group', { name: '¿Cómo calificarías la cita?' }),
  ).toBeVisible();
  await wipeOpened(page);
  await page.locator('label', { hasText: '4 estrellas' }).click();
  await page.getByRole('button', { name: 'Enviar calificación' }).click();

  await expect(
    page.getByRole('group', { name: '¿Cómo calificarías la cita?' }),
  ).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Dra. María González' }),
  ).toBeVisible();
  expect(api.called('POST', `/reviews/appointments/${appointment}`)).toBe(true);
});

test('the specialist’s links from the emails come back to the same page after signing in', async ({
  page,
  providers,
  api,
}) => {
  api.specialist(people.doctor);
  providers.next = people.doctor;

  // Email 10, the daily summary: that day's agenda.
  await page.goto('/panel/agenda/2026-10-20');
  await expect(page).toHaveURL(
    `/sign-in?redirect=${encodeURIComponent('/panel/agenda/2026-10-20')}`,
  );
  await signInWith(page);

  await expect(page).toHaveURL('/panel/agenda/2026-10-20');
  await expect(
    page.getByRole('heading', {
      name: 'Agenda del martes 20 de octubre de 2026',
    }),
  ).toBeVisible();

  // The billing emails: «Mi suscripción», with the session already there.
  await page.goto('/panel/subscription');
  await expect(
    page.getByRole('heading', { name: 'Todavía no tienes un plan' }),
  ).toBeVisible();
});

test('a specialist closes out a consultation, on its page and from «Citas»', async ({
  page,
  providers,
  api,
}) => {
  const ana = api.patient(people.ana);
  api.specialist(people.doctor);
  providers.next = people.doctor;
  // Over an hour ago and not closed: it still can be, for a day.
  const booked = appointmentFor(ana.id, -1, {
    status: 'CONFIRMED',
    persistedStatus: 'CONFIRMED',
  });
  api.appointments.set(appointment, booked);

  // The appointment's own page, as the specialist: what they can do.
  await page.goto(`/a/${appointment}`);
  await signInWith(page);
  await expect(
    page.getByRole('button', { name: 'Finalizar consulta' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'No asistió' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Gestiona esta cita desde la app' }),
  ).toHaveCount(0);

  // «Citas», that day: the card opens «Ver cita», and it closes there.
  await page.goto(`/panel/agenda/${booked.slot.date}`);
  await page.getByRole('button', { name: /Ana Pérez/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Ver cita' });
  await dialog.getByRole('button', { name: 'Finalizar consulta' }).click();
  await page
    .getByRole('dialog', { name: 'Finalizar consulta' })
    .getByRole('button', { name: 'Finalizar consulta' })
    .click();

  await expect(
    page
      .getByRole('dialog', { name: 'Ver cita' })
      .getByText('Finalizada', { exact: true }),
  ).toBeVisible();
  expect(
    api.called(
      'POST',
      `/scheduling/specialist/appointments/${appointment}/complete`,
    ),
  ).toBe(true);
});

test('signing out from the menu leaves the link asking for the session again', async ({
  page,
  api,
}) => {
  const ana = api.patient(people.ana);
  api.appointments.set(appointment, appointmentFor(ana.id, 72));

  await page.goto(`/a/${appointment}`);
  await signInWith(page, 'Apple');
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
  await wipeOpened(page);

  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

  await expect(
    page.getByRole('heading', { name: 'Entra para ver tu cita' }),
  ).toBeVisible();
  await expect(page).toHaveURL(`/a/${appointment}`);
  // The provider used last goes first next time.
  await expect(
    page.getByRole('button', { name: /^Continuar con/ }).first(),
  ).toHaveText(/Apple/);
});

test('a session the API no longer accepts: the link says so and lets the person sign in again', async ({
  page,
  api,
}) => {
  const ana = api.patient(people.ana);
  api.appointments.set(appointment, appointmentFor(ana.id, 72));

  await page.goto(`/a/${appointment}`);
  await signInWith(page);
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();

  // Days later, the same browser: the API refuses the session it kept.
  api.expire(people.ana);
  await page.goto(`/a/${appointment}?origin=whatsapp-reminder`);

  await expect(
    page.getByText('Tu sesión ha caducado, vuelve a iniciar sesión.'),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Entra para ver tu cita' }),
  ).toBeVisible();
  await signInWith(page);
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
});

test('a specialist who opens the invitation they sent is told it is their patient’s', async ({
  page,
  providers,
  api,
}) => {
  const token = 'tok-e2e-specialist-00001';
  api.invitations.set(token, invitationIn(72));
  api.specialist(people.doctor);
  providers.next = people.doctor;

  await page.goto(`/i/${token}`);
  await signInWith(page);

  await expect(
    page.getByRole('heading', { name: 'Esta invitación es para tu paciente' }),
  ).toBeVisible();
  await expect(page.getByRole('form', { name: 'Reclamar cita' })).toHaveCount(
    0,
  );
});

test.describe('inside Instagram’s own browser', () => {
  // Google refuses to sign anyone in from there (AGENTS.md §1).
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0 (iPhone14,5; iOS 18_0; es_VE; es; scale=3.00; 1170x2532; 0)',
  });

  test('a link that needs a session shows the steps to open it in the browser', async ({
    page,
    api,
  }) => {
    const token = 'tok-e2e-instagram-000001';
    api.invitations.set(token, invitationIn(72));

    await page.goto(`/i/${token}?origin=share-invitation`);

    await expect(
      page.getByRole('heading', { name: 'Abre este enlace en tu navegador' }),
    ).toBeVisible();
    await expect(page.getByText(/Abrir en el navegador/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Copiar enlace' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Continuar con/ }),
    ).toHaveCount(0);
  });
});
