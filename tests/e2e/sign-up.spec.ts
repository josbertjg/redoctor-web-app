import { expect, people, signInWith, test, wipeOpened } from './signed-in';

/*
 * The sign-up as the designer drew it (2026-11-03): who the person is, the
 * account made in place, the form of the role. A specialist creates the
 * account on the web and the app registers the specialties.
 */

test('a specialist creates the account on the web, then the app takes over', async ({
  page,
  providers,
}) => {
  providers.next = people.carmen;

  await page.goto('/sign-up');
  await page.getByRole('button', { name: /^Especialista/ }).click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Crea tu cuenta como especialista',
    }),
  ).toBeVisible();
  await signInWith(page);

  // The same page: now the form, under the blue wipe.
  await expect(page.getByRole('textbox', { name: 'Nombre' })).toBeVisible();
  await wipeOpened(page);
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Carmen');
  await page.getByRole('textbox', { name: 'Apellido' }).fill('Díaz');
  await page.getByLabel('Fecha de nacimiento').fill('1985-03-02');
  await page
    .getByRole('textbox', { name: 'Cédula de identidad' })
    .fill('12345678');
  await page.getByText('Mujer', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('04141234567');
  await page.getByRole('checkbox', { name: /He leído/ }).check();
  await page.getByRole('checkbox', { name: /Autorizo/ }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(
    page.getByRole('heading', { name: '¡Tu cuenta está creada!' }),
  ).toBeVisible();
  await wipeOpened(page);
  await page.getByRole('link', { name: 'Ir a mi panel' }).click();

  await expect(page).toHaveURL('/panel');
  await expect(
    page.getByRole('heading', { name: 'Termina tu registro en la app' }),
  ).toBeVisible();
});
