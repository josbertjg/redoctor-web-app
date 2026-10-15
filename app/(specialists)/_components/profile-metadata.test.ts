import { createFormatter, createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { defaultLocale, timeZone } from '@/app/lib/i18n/config';
import messages from '@/app/lib/i18n/messages/es.json';

import {
  buildPublicProfileResponse,
  buildSpecialistProfile,
} from '@/tests/factories/specialists';

import { profileMetaWords, type MetaWordsTools } from './profile-metadata';

const t = createTranslator({ locale: defaultLocale, messages });
const format = createFormatter({ locale: defaultLocale, timeZone });

/** The same tools the page hands in, over the real catalog. */
const tools: MetaWordsTools = {
  t: (key, values) => t(key as Parameters<typeof t>[0], values),
  list: (items) => format.list(items, { type: 'conjunction' }),
  number: (value) =>
    format.number(value, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
};

describe('profileMetaWords', () => {
  it('names the specialist with the first specialty, and says what a patient decides by', () => {
    expect(profileMetaWords(buildSpecialistProfile(), tools)).toEqual({
      title: 'Ana Pérez, Medicina Interna',
      description:
        'Ana Pérez: Medicina Interna. Especialista verificado. Consultorio: Clínica El Ávila. Calificación 4,5 de 5 (2 reseñas). Agenda tu cita en línea en Redoctor.',
    });
  });

  it('joins the specialties and names two offices before «y N más»', () => {
    const office = (id: string, name: string) => ({
      id,
      name,
      address: 'Caracas',
      description: null,
      latitude: 10.5,
      longitude: -66.9,
      timezone: 'America/Caracas',
    });
    const profile = buildSpecialistProfile(
      buildPublicProfileResponse({
        specialties: [
          {
            specialtyName: 'Medicina Interna',
            specialtyPath: ['Medicina', 'Medicina Interna'],
            collegeName: 'Colegio',
            isVerified: true,
            subspecialties: [],
          },
          {
            specialtyName: 'Cardiología',
            specialtyPath: ['Medicina', 'Cardiología'],
            collegeName: 'Colegio',
            isVerified: true,
            subspecialties: [],
          },
        ],
        offices: [
          office('1', 'Clínica El Ávila'),
          office('2', 'Centro Médico La Trinidad'),
          office('3', 'Policlínica Metropolitana'),
        ],
        rating: { average: 5, count: 1 },
      }),
    );

    expect(profileMetaWords(profile, tools)).toEqual({
      title: 'Ana Pérez, Medicina Interna',
      description:
        'Ana Pérez: Medicina Interna y Cardiología. Especialista verificado. Consultorios: Clínica El Ávila, Centro Médico La Trinidad y 1 más. Calificación 5,0 de 5 (1 reseña). Agenda tu cita en línea en Redoctor.',
    });
  });

  it('falls back to the plain words for a profile with nothing verified yet', () => {
    const profile = buildSpecialistProfile(
      buildPublicProfileResponse({
        verified: false,
        specialties: [],
        offices: [],
        rating: { average: null, count: 0 },
      }),
    );

    expect(profileMetaWords(profile, tools)).toEqual({
      title: 'Ana Pérez',
      description:
        'Perfil de Ana Pérez en Redoctor: especialidades, consultorios y opiniones de sus pacientes. Agenda tu cita en línea en Redoctor.',
    });
  });
});
