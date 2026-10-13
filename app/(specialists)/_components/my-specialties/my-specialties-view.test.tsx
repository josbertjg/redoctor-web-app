import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import {
  buildMyProfileResponse,
  buildOwnSpecialty,
} from '@/tests/factories/specialists';
import { renderPanel } from '@/tests/panel';

import { MySpecialtiesView } from './my-specialties-view';
import { apiUrl, errorEnvelope } from '../../../../tests/msw/api-url';
import { server } from '../../../../tests/msw/server';

function renderSpecialties() {
  return renderPanel(<MySpecialtiesView />, pageNamespaces.mySpecialties);
}

function withSpecialties(specialties: ReturnType<typeof buildOwnSpecialty>[]) {
  server.use(
    http.get(apiUrl('/specialists/profile'), () =>
      HttpResponse.json(buildMyProfileResponse({ specialties })),
    ),
  );
}

const pediatrics = buildOwnSpecialty({
  id: 'pediatrics',
  specialtyName: 'Pediatría',
  specialtyPath: ['Medicina', 'Pediatría'],
  verificationStatus: 'REJECTED',
  rejectionReason: 'La matrícula no coincide con el colegio.',
});

describe('«Mis especialidades»', () => {
  it('lists every specialty, what asks something first, each with its review', async () => {
    withSpecialties([
      buildOwnSpecialty({ id: 'internal' }),
      buildOwnSpecialty({
        id: 'cardiology',
        specialtyName: 'Cardiología',
        specialtyPath: ['Medicina', 'Cardiología'],
        verificationStatus: 'PENDING',
        subspecialties: ['Ecocardiografía'],
      }),
      pediatrics,
    ]);
    const { container } = renderSpecialties();

    const cards = await screen.findAllByRole('article');
    expect(
      cards.map((card) => within(card).getByRole('heading').textContent),
    ).toEqual(['Pediatría', 'Cardiología', 'Medicina Interna']);

    const [rejected, pending, verified] = cards as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    expect(within(rejected).getByText('Rechazada')).toBeInTheDocument();
    expect(within(rejected).getByText('MOTIVO')).toBeInTheDocument();
    expect(
      within(rejected).getByText('La matrícula no coincide con el colegio.'),
    ).toBeInTheDocument();
    expect(within(pending).getByText('En revisión')).toBeInTheDocument();
    expect(within(pending).getByText('Ecocardiografía')).toBeInTheDocument();
    expect(within(verified).getByText('Verificada')).toBeInTheDocument();
    expect(within(verified).getByText('Medicina')).toBeInTheDocument();
    expect(within(verified).getByText('12345')).toBeInTheDocument();
    expect(
      within(verified).getByText(
        'Colegio de Médicos del Distrito Metropolitano',
      ),
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute(
      'href',
      '/panel/profile',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('offers support after a rejection, in a message that names no one', async () => {
    withSpecialties([pediatrics]);
    renderSpecialties();

    const support = await screen.findByRole('link', {
      name: 'Contactar a soporte',
    });
    const href = new URL(support.getAttribute('href') ?? '');
    const message = href.searchParams.get('text') ?? '';

    expect(href.hostname).toBe('wa.me');
    expect(message).toContain(
      'Quisiera revisar el rechazo de una de mis especialidades',
    );
    for (const personal of ['Pediatría', 'Luis', 'matrícula no coincide']) {
      expect(message).not.toContain(personal);
    }
  });

  it('says when no reason was given for a rejection', async () => {
    withSpecialties([{ ...pediatrics, rejectionReason: null }]);
    renderSpecialties();

    expect(
      await screen.findByText(
        'No se indicó un motivo. Escríbenos si necesitas ayuda para corregirla.',
      ),
    ).toBeInTheDocument();
  });

  it('offers no support when nothing was rejected', async () => {
    withSpecialties([buildOwnSpecialty()]);
    renderSpecialties();

    expect(await screen.findByText('Verificada')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Contactar a soporte' }),
    ).not.toBeInTheDocument();
  });

  it('says when none is registered yet, with the way to the app', async () => {
    withSpecialties([]);
    renderSpecialties();

    expect(
      await screen.findByRole('heading', {
        name: 'Aún no has registrado ninguna especialidad',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '¿Quieres cambiar algo?' }),
    ).toBeInTheDocument();
  });

  it('says when they cannot be read, and tries again', async () => {
    let refuse = true;
    server.use(
      http.get(apiUrl('/specialists/profile'), () =>
        refuse
          ? HttpResponse.json(errorEnvelope('ERR_1002', 'Validation failed'), {
              status: 400,
            })
          : HttpResponse.json(buildMyProfileResponse()),
      ),
    );
    renderSpecialties();

    expect(
      await screen.findByRole('heading', {
        name: 'No pudimos cargar tus especialidades',
      }),
    ).toBeInTheDocument();
    refuse = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Verificada')).toBeInTheDocument();
  });
});
