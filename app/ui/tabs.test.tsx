import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from './tabs';

const items = [
  { value: 'education', label: 'Educación', content: <p>Especialidades</p> },
  {
    value: 'certifications',
    label: 'Certificaciones',
    content: <p>Diplomados</p>,
  },
] as const;

describe('Tabs', () => {
  it('opens on the first tab and switches between them', async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <Tabs
        label="Formación de Ana Pérez"
        items={items}
        onValueChange={onValueChange}
      />,
    );

    expect(
      screen.getByRole('tablist', { name: 'Formación de Ana Pérez' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Especialidades')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Certificaciones' }));
    expect(screen.getByText('Diplomados')).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Certificaciones' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(onValueChange).toHaveBeenCalledWith('certifications');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('opens on the tab asked for', () => {
    render(
      <Tabs label="Tus citas" items={items} defaultValue="certifications" />,
    );

    expect(screen.getByText('Diplomados')).toBeInTheDocument();
    expect(screen.queryByText('Especialidades')).not.toBeInTheDocument();
  });
});
