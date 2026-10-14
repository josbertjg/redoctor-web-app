import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { buildSpecialistProfile } from '@/tests/factories/specialists';
import { renderWithIntl } from '@/tests/render';

import { CertificationList } from './certification-list';
import { OfficeList } from './office-list';
import { ShowMoreText } from './show-more-text';
import { SpecialtyList } from './specialty-list';

const profile = buildSpecialistProfile();

describe('OfficeList', () => {
  const booking = { specialistId: profile.id, expectSpecialist: false };

  it('gives each office its directions in Google Maps', async () => {
    const { container } = renderWithIntl(
      <OfficeList offices={profile.offices} booking={booking} />,
    );

    expect(screen.getByText('Piso 6, consultorio 604')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Cómo llegar a Clínica El Ávila' }),
    ).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=10.4965%2C-66.8487',
    );
    // One office: the profile's «Agendar cita» already books there.
    expect(
      screen.queryByRole('link', { name: 'Agendar en este consultorio' }),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('with two offices, books at the one chosen', () => {
    const [first] = profile.offices;
    if (first === undefined) throw new Error('The fixture has an office.');
    const second = {
      ...first,
      id: 'office-2',
      name: 'Centro Médico La Floresta',
    };
    renderWithIntl(<OfficeList offices={[first, second]} booking={booking} />);

    const links = screen.getAllByRole('link', {
      name: 'Agendar en este consultorio',
    });
    expect(links).toHaveLength(2);
    expect(links[1]).toHaveAttribute(
      'href',
      `/book/${profile.id}?office=office-2`,
    );
  });
});

describe('SpecialtyList', () => {
  it('lists parents before their children, with their college', () => {
    renderWithIntl(
      <SpecialtyList
        specialties={[
          {
            name: 'Cardiología pediátrica',
            path: ['Medicina', 'Pediatría', 'Cardiología pediátrica'],
            college: '',
            subspecialties: [],
          },
          {
            name: 'Pediatría',
            path: ['Medicina', 'Pediatría'],
            college: 'Colegio de Médicos',
            subspecialties: [],
          },
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Pediatría: Colegio de Médicos');
    expect(items[1]).toHaveTextContent(/^Cardiología pediátrica$/);
  });
});

describe('CertificationList', () => {
  it('names the type and the institution', () => {
    renderWithIntl(
      <CertificationList certifications={profile.certifications} />,
    );

    expect(screen.getByText('Diplomado')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent(
      'Diplomado en Medicina Interna: Universidad Central de Venezuela (2016)',
    );
  });

  it('says so when there is none', () => {
    renderWithIntl(<CertificationList certifications={[]} />);

    expect(
      screen.getByText('Aún no hay certificaciones para mostrar'),
    ).toBeInTheDocument();
  });
});

describe('ShowMoreText', () => {
  const labels = { more: 'Leer más', less: 'Ver menos' };
  const long = `${'Atiendo adultos con enfermedades crónicas. '.repeat(8)}Fin.`;

  it('shows a short text whole', () => {
    render(<ShowMoreText text="Breve." limit={200} labels={labels} />);

    expect(screen.queryByRole('button')).toBe(null);
  });

  it('cuts a long text and opens it on demand', async () => {
    render(<ShowMoreText text={long} limit={200} labels={labels} />);

    const more = screen.getByRole('button', { name: 'Leer más' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    // In the page for search engines, out of sight until asked for.
    expect(screen.getByText(/Fin\./)).not.toBeVisible();

    await userEvent.click(more);

    expect(screen.getByRole('button', { name: 'Ver menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText(/Fin\./)).toBeVisible();
  });
});
