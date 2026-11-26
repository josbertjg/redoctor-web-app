import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { ProfileTabs } from './profile-tabs';

const sections = [
  { id: 'descripcion', title: 'Descripción' },
  { id: 'opiniones', title: 'Opiniones' },
  { id: 'sobre-el-especialista', title: 'Sobre este especialista' },
] as const;

describe('ProfileTabs', () => {
  it('takes the page to each section and marks the one chosen', async () => {
    const { container } = render(
      <ProfileTabs label="Secciones del perfil" sections={sections} />,
    );

    const nav = screen.getByRole('navigation', {
      name: 'Secciones del perfil',
    });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Opiniones' })).toHaveAttribute(
      'href',
      '#opiniones',
    );
    // The first section is the one in view at first.
    expect(screen.getByRole('link', { name: 'Descripción' })).toHaveAttribute(
      'aria-current',
      'location',
    );

    await userEvent.click(
      screen.getByRole('link', { name: 'Sobre este especialista' }),
    );
    expect(
      screen.getByRole('link', { name: 'Sobre este especialista' }),
    ).toHaveAttribute('aria-current', 'location');
    expect(
      screen.getByRole('link', { name: 'Descripción' }),
    ).not.toHaveAttribute('aria-current');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps the clicked tab active after the browser scrolls to its scroll-mt-20 anchor or hits the bottom of the page', async () => {
    let tops: Record<string, number> = {
      descripcion: -120,
      opiniones: 80,
      'sobre-el-especialista': 420,
    };
    const rect = (top: number): DOMRect => ({
      top,
      bottom: top + 48,
      left: 0,
      right: 300,
      width: 300,
      height: 48,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });

    render(
      <div>
        <ProfileTabs label="Secciones del perfil" sections={sections} />
        {sections.map((s) => (
          <section key={s.id} id={s.id}>
            {s.title}
          </section>
        ))}
      </div>,
    );

    const nav = screen.getByRole('navigation', {
      name: 'Secciones del perfil',
    });
    nav.getBoundingClientRect = () => rect(0);
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) {
        el.getBoundingClientRect = () => rect(tops[s.id] ?? 0);
      }
    }

    // Click Opiniones -> browser scrolls #opiniones to scroll-mt-20 (80px) and fires scroll.
    await userEvent.click(screen.getByRole('link', { name: 'Opiniones' }));
    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 300,
        configurable: true,
      });
      fireEvent.scroll(window);
    });
    expect(screen.getByRole('link', { name: 'Opiniones' })).toHaveAttribute(
      'aria-current',
      'location',
    );

    // Click Sobre este especialista -> short bottom section stops at 240px while #opiniones is at 20px.
    tops = {
      descripcion: -260,
      opiniones: 20,
      'sobre-el-especialista': 240,
    };
    await userEvent.click(
      screen.getByRole('link', { name: 'Sobre este especialista' }),
    );
    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 460,
        configurable: true,
      });
      fireEvent.scroll(window);
    });
    expect(
      screen.getByRole('link', { name: 'Sobre este especialista' }),
    ).toHaveAttribute('aria-current', 'location');
  });
});
