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
import { TrainingTabs } from './training-tabs';

const profile = buildSpecialistProfile();

describe('OfficeList', () => {
  it('gives each office its directions in Google Maps', async () => {
    const { container } = renderWithIntl(
      <OfficeList offices={profile.offices} />,
    );

    expect(screen.getByText('Piso 6, consultorio 604')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Cómo llegar a Clínica El Ávila' }),
    ).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=10.4965%2C-66.8487',
    );
    expect(await axe(container)).toHaveNoViolations();
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

describe('TrainingTabs', () => {
  it('switches between education and certifications', async () => {
    const { container } = render(
      <TrainingTabs
        label="Formación de Ana Pérez"
        labels={{ education: 'Educación', certifications: 'Certificaciones' }}
        education={<p>Especialidades</p>}
        certifications={<p>Diplomados</p>}
      />,
    );

    expect(screen.getByText('Especialidades')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Certificaciones' }));
    expect(screen.getByText('Diplomados')).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Certificaciones' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });
});
