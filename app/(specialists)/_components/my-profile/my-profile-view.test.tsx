import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { toast } from '@/app/ui/toast';
import { buildOffices } from '@/tests/factories/agenda';
import { buildSubscription, planIds, usd } from '@/tests/factories/billing';
import { buildSpecialistMeResponse } from '@/tests/factories/identity';
import { buildWeeklySchedule } from '@/tests/factories/offices';
import {
  buildMyProfileResponse,
  buildOwnSpecialty,
  knownSpecialistId,
} from '@/tests/factories/specialists';
import { renderPanel, specialistSession } from '@/tests/panel';

import { MyProfileView } from './my-profile-view';
import { apiUrl, errorEnvelope } from '../../../../tests/msw/api-url';
import { subscriptionHandler } from '../../../../tests/msw/handlers/billing';
import { meHandler } from '../../../../tests/msw/handlers/identity';
import { server } from '../../../../tests/msw/server';

/** «Mi perfil» for a specialist whose profile stands where `visibilityStatus` says. */
function renderProfile(visibilityStatus = 'VISIBLE') {
  const me = buildSpecialistMeResponse({ visibilityStatus });
  server.use(meHandler(me));
  return renderPanel(
    <MyProfileView />,
    pageNamespaces.myProfile,
    specialistSession(me),
  );
}

const profileHandler = (response: ReturnType<typeof buildMyProfileResponse>) =>
  http.get(apiUrl('/specialists/profile'), () => HttpResponse.json(response));

const refused = () =>
  HttpResponse.json(errorEnvelope('ERR_1002', 'Validation failed'), {
    status: 400,
  });

const section = (name: string) => screen.getByRole('region', { name });

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('«Mi perfil»', () => {
  it('shows the profile as the app does, section by section', async () => {
    const { container } = renderProfile();

    expect(
      await screen.findByRole('heading', { name: 'Tu perfil está activo' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Perfil activo')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Mi perfil' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Dr. Luis Gómez' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Especialista verificado' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vista previa' })).toHaveAttribute(
      'href',
      `/s/${knownSpecialistId}`,
    );

    const offices = section('Consultorios de atención');
    expect(within(offices).getByText('Clínica Canaima')).toBeInTheDocument();
    expect(within(offices).getByText('Activo')).toBeInTheDocument();

    const prices = section('Precios y motivos de consulta');
    expect(
      await within(prices).findByText('Consulta general'),
    ).toBeInTheDocument();
    expect(within(prices).getByText('Precio estándar')).toBeInTheDocument();
    expect(within(prices).getAllByText('$ 40')).toHaveLength(2);
    expect(
      within(prices).queryByText('Electrocardiograma'),
    ).not.toBeInTheDocument();

    const hours = section('Horarios');
    expect(await within(hours).findByText('Lun a Jue')).toBeInTheDocument();
    expect(within(hours).getByText('Vie')).toBeInTheDocument();
    // One range a line: Monday to Thursday's, and Friday's two.
    expect(within(hours).getAllByText('8:00 a. m. – 12:00 p. m.')).toHaveLength(
      2,
    );
    expect(
      within(hours).getByText('2:00 p. m. – 6:00 p. m.'),
    ).toBeInTheDocument();
    expect(within(hours).getByText('30 min por cita')).toBeInTheDocument();

    expect(
      screen.getByText('Medicina Interna', { selector: 'strong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Mis especialidades' }),
    ).toHaveAttribute('href', '/panel/specialties');
    expect(
      screen.getByRole('heading', { name: '¿Quieres cambiar algo?' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says why patients do not find it, and leads to the reasons of a rejection', async () => {
    server.use(
      profileHandler(
        buildMyProfileResponse({
          specialties: [
            buildOwnSpecialty({
              verificationStatus: 'REJECTED',
              rejectionReason: 'La matrícula no coincide.',
            }),
          ],
        }),
      ),
    );
    renderProfile('SPECIALTIES_REJECTED');

    expect(
      await screen.findByRole('heading', { name: 'Revisa tus credenciales' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Acción requerida')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver motivos' })).toHaveAttribute(
      'href',
      '/panel/specialties',
    );
    expect(screen.getByText('Verificación rechazada')).toBeInTheDocument();
    expect(
      screen.getByText('No pudimos verificar tus especialidades'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Revisar especialidades' }),
    ).toHaveAttribute('href', '/panel/specialties');
  });

  it('names the step only the app takes, and asks to turn an office on when none is', async () => {
    server.use(
      http.get(apiUrl('/specialists/offices'), () => {
        const { offices } = buildOffices();
        return HttpResponse.json({
          offices: offices.map((office) => ({ ...office, isActive: false })),
        });
      }),
    );
    renderProfile('NO_OFFICES');

    expect(
      await screen.findByRole('heading', { name: 'Activa un consultorio' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Perfil Inactivo')).toBeInTheDocument();
    expect(
      within(section('Consultorios de atención')).getByText('Inactivo'),
    ).toBeInTheDocument();
  });

  it('leads to the plans when the profile only lacks one', async () => {
    renderProfile('NO_SUBSCRIPTION');

    expect(
      await screen.findByRole('heading', { name: 'Elige tu plan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planes' })).toHaveAttribute(
      'href',
      '/pay',
    );
  });

  it('counts the offices the plan allows and, at its cap, invites to the plan with more', async () => {
    server.use(
      subscriptionHandler(
        buildSubscription({
          status: 'ACTIVE',
          plan: { id: planIds.essential, slug: 'esencial', name: 'Esencial' },
          price: usd(1500),
          incompleteExpiresAt: null,
        }),
      ),
    );
    renderProfile();

    expect(
      await screen.findByText('Estás usando 1 de 1 consultorio'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Tu plan permite 1 consultorio activo. Cambia a un plan con más para atender en más sedes.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Profesional')).toBeInTheDocument();
    expect(
      screen.getByText('Hasta 3 consultorios activos'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mejorar plan' })).toHaveAttribute(
      'href',
      '/pay?plan=profesional',
    );
  });

  it('keeps every section the specialist has not filled, in the app’s words', async () => {
    server.use(
      profileHandler(
        buildMyProfileResponse({
          profile: {
            description: null,
            experiencia: null,
            certificationList: [],
            gallery: [],
          },
          specialties: [],
        }),
      ),
      http.get(apiUrl('/specialists/offices'), () =>
        HttpResponse.json({ offices: [] }),
      ),
    );
    renderProfile('NO_SPECIALTIES');

    expect(
      await screen.findByRole('heading', { name: 'Registra tu especialidad' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nuevo en Redoctor')).toBeInTheDocument();
    for (const words of [
      'Añade una breve descripción sobre quién eres y qué haces',
      'Añade un consultorio',
      'Añade los motivos y precios de tus citas',
      'Añade tus horarios de disponibilidad',
      'Añade una o varias fotos a tu galería',
      'Añade con mayor detalle tu experiencia y práctica profesional',
      'Aún no hay educación para mostrar',
    ]) {
      expect(screen.getByText(words)).toBeInTheDocument();
    }
  });

  it('says in its place what one office could not read, and tries again', async () => {
    let refuse = true;
    server.use(
      http.get(apiUrl('/specialists/offices/:officeId/schedule'), () =>
        refuse ? refused() : HttpResponse.json(buildWeeklySchedule()),
      ),
    );
    renderProfile();

    expect(
      await screen.findByText(
        'No pudimos cargar los horarios de Clínica Canaima.',
      ),
    ).toBeInTheDocument();
    refuse = false;
    await userEvent.click(
      within(section('Horarios')).getByRole('button', { name: 'Reintentar' }),
    );
    expect(
      await within(section('Horarios')).findByText('Lun a Jue'),
    ).toBeInTheDocument();
  });

  it('says when the profile cannot be read, and tries again', async () => {
    let refuse = true;
    server.use(
      http.get(apiUrl('/specialists/profile'), () =>
        refuse ? refused() : HttpResponse.json(buildMyProfileResponse()),
      ),
    );
    renderProfile();

    expect(
      await screen.findByRole('heading', {
        name: 'No pudimos cargar tu perfil',
      }),
    ).toBeInTheDocument();
    refuse = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('heading', { name: 'Dr. Luis Gómez' }),
    ).toBeInTheDocument();
  });

  it('shares the bare link to the public profile, copied where the browser cannot share', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const copied = vi.spyOn(toast, 'success');
    renderProfile();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Compartir perfil' }),
    );

    expect(writeText).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`/s/${knownSpecialistId}$`)),
    );
    expect(copied).toHaveBeenCalledWith('Copiamos el enlace a tu perfil.');
  });
});
