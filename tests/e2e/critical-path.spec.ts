import { auditAccessibility } from './helpers';
import {
  expect,
  invitationIn,
  people,
  signInWith,
  test,
  wipeOpened,
} from './signed-in';

/*
 * The pilot's critical path (H2, AGENTS.md §1 and §10): the specialist
 * sends the invitation by WhatsApp, the patient opens it on a phone, signs
 * in with Google or Apple, claims the appointment and confirms it. Signed
 * in through Firebase's own popup flow, with the provider's window and the
 * API answered in the browser (signed-in.ts).
 */

test.describe.configure({ timeout: 90_000 });

/** The appointment every invitation of the factory is for. */
const appointmentId = '8f2c1a3e-6b7d-4c2e-9a1f-3d4e5f6a7b8c';

test('a new patient claims the invitation from WhatsApp and confirms it in the same step', async ({
  page,
  providers,
  api,
}) => {
  const token = 'tok-e2e-new-patient-0001';
  api.invitations.set(token, invitationIn(20));
  // A first sign-in: the API makes the account when it is first read.
  providers.next = people.carmen;

  await page.goto(`/i/${token}?origin=whatsapp-invitation`);
  await expect(
    page.getByRole('heading', { name: 'Necesitas una cuenta para reclamarla' }),
  ).toBeVisible();
  await signInWith(page);

  // Signed in, the page says where the appointment goes and asks for
  // whom; the sign-up comes first.
  const claim = page.getByRole('form', { name: 'Reclamar cita' });
  await expect(claim.getByText('carmen.diaz@gmail.com')).toBeVisible();
  await expect(
    claim.getByText('Para reclamar la cita solo falta completar tus datos.'),
  ).toBeVisible();
  await claim.getByText('Para mí', { exact: true }).click();
  await claim.getByRole('button', { name: 'Continuar' }).click();

  // The sign-up starts from the invitation's data.
  await expect(page).toHaveURL(
    `/sign-up?redirect=${encodeURIComponent(`/i/${token}?for=self`)}`,
  );
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Crea tu cuenta para reclamar tu cita',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Fecha de nacimiento' }),
  ).toHaveValue('1990-05-14');
  await expect(
    page.getByRole('textbox', { name: 'Cédula de identidad' }),
  ).toHaveValue('12345678');
  await expect(page.getByRole('radio', { name: 'Mujer' })).toBeChecked();
  expect(await auditAccessibility(page)).toEqual([]);

  await page.getByRole('textbox', { name: 'Nombre' }).fill('Carmen');
  await page.getByRole('textbox', { name: 'Apellido' }).fill('Díaz');
  await page.getByRole('checkbox', { name: /^He leído y acepto/ }).check();
  await page
    .getByRole('checkbox', { name: /^Autorizo el uso de mis datos/ })
    .check();
  await page.getByRole('button', { name: 'Finalizar' }).click();

  await expect(
    page.getByRole('heading', { name: '¡Todo listo!' }),
  ).toBeVisible();
  await wipeOpened(page);
  await page.getByRole('button', { name: 'Reclamar mi cita' }).click();

  // Back on the invitation: «Para mí», confirmed in the same step.
  await expect(page).toHaveURL(`/i/${token}?for=self`);
  await expect(claim.getByRole('radio', { name: /^Para mí/ })).toBeChecked();
  await expect(
    claim.getByRole('checkbox', { name: 'Confirmar mi asistencia' }),
  ).toBeChecked();
  await claim.getByRole('button', { name: 'Reclamar cita' }).click();

  await expect(
    page.getByRole('heading', { name: '¡Listo! La cita ya es tuya' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'La cita quedó vinculada a tu cuenta y tu asistencia está confirmada.',
    ),
  ).toBeVisible();
  await wipeOpened(page);
  await page.getByRole('link', { name: 'Ver mi cita' }).click();

  await expect(page).toHaveURL(`/a/${appointmentId}`);
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
  // The reminders bring the same link back: read again, still confirmed.
  await page.reload();
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
  expect(api.called('POST', '/identity/register')).toBe(true);
  expect(api.called('POST', '/identity/complete-registration')).toBe(true);
});

test('a patient with an account claims it with Apple, and confirms it on its page once the window opens', async ({
  page,
  providers,
  api,
}) => {
  const token = 'tok-e2e-patient-00000001';
  api.invitations.set(token, invitationIn(72));
  api.patient(people.ana);

  await page.goto(`/i/${token}?origin=whatsapp-invitation`);
  await signInWith(page, 'Apple');

  const claim = page.getByRole('form', { name: 'Reclamar cita' });
  await claim.getByText('Para mí', { exact: true }).click();
  expect(providers.signIns.map(({ provider }) => provider)).toEqual([
    'apple.com',
  ]);
  // Three days ahead: nothing to confirm yet.
  await expect(
    claim.getByRole('checkbox', { name: 'Confirmar mi asistencia' }),
  ).toHaveCount(0);
  expect(await auditAccessibility(page)).toEqual([]);
  await claim.getByRole('button', { name: 'Reclamar cita' }).click();

  await expect(
    page.getByRole('heading', { name: '¡Listo! La cita ya es tuya' }),
  ).toBeVisible();
  await expect(
    page.getByText('La cita está vinculada a tu cuenta.'),
  ).toBeVisible();
  await wipeOpened(page);
  await page.getByRole('link', { name: 'Ver mi cita' }).click();

  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
  await expect(page.getByText(/podrás confirmar tu cita\.$/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirmar cita' }),
  ).toHaveCount(0);

  // The day before, the reminder brings the link back: the window is open.
  const claimed = api.appointments.get(appointmentId);
  expect(claimed).toBeDefined();
  if (claimed) {
    api.appointments.set(appointmentId, { ...claimed, canConfirmNow: true });
  }
  await page.goto(`/a/${appointmentId}?origin=whatsapp-reminder`);
  await page.getByRole('button', { name: 'Confirmar cita' }).click();

  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Hemos notificado al especialista que asistirás a la cita.'),
  ).toBeVisible();
});

test('a parent claims the appointment of a child in their care', async ({
  page,
  api,
}) => {
  const token = 'tok-e2e-dependent-000001';
  api.invitations.set(
    token,
    invitationIn(96, {
      invitation: {
        invitedFirstName: 'Sofía',
        invitedDocumentType: null,
        invitedDocumentNumber: null,
        minorWithoutDocument: true,
        invitedDateOfBirth: null,
        invitedSex: null,
      },
      appointment: { attendee: { firstName: 'Sofía', lastName: 'Pérez' } },
    }),
  );
  api.patient(people.ana);

  await page.goto(`/i/${token}?origin=whatsapp-invitation`);
  await signInWith(page);

  // No document to compare with: claimed as the child's representative,
  // and what the invitation lacks of the child is asked right there.
  const claim = page.getByRole('form', { name: 'Reclamar cita' });
  await expect(
    claim.getByText(/solo puedes reclamarla como representante del paciente/),
  ).toBeVisible();
  await expect(claim.getByRole('radio', { name: /^Para mí/ })).toHaveCount(0);
  await claim
    .getByRole('textbox', { name: 'Fecha de nacimiento' })
    .fill('2019-03-01');
  await claim.getByText('Mujer', { exact: true }).click();
  await claim.getByRole('button', { name: 'Reclamar cita' }).click();

  await expect(
    page.getByRole('heading', { name: '¡Listo! La cita ya es tuya' }),
  ).toBeVisible();
  await wipeOpened(page);
  await page.getByRole('link', { name: 'Ver mi cita' }).click();

  await expect(page).toHaveURL(`/a/${appointmentId}`);
  await expect(page.getByText('Sofía Pérez')).toBeVisible();
});
