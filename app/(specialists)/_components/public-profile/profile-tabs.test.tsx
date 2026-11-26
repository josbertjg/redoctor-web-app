import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

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

    // Click Sobre este especialista -> multi-frame smooth scroll over 500ms stops at bottom (top = 290px).
    const nowSpy = vi.spyOn(performance, 'now');
    nowSpy.mockReturnValue(1000);
    await userEvent.click(
      screen.getByRole('link', { name: 'Sobre este especialista' }),
    );

    // Frame 1 at +80ms (mid-scroll, scrollY = 360)
    nowSpy.mockReturnValue(1080);
    tops = {
      descripcion: -180,
      opiniones: 90,
      'sobre-el-especialista': 360,
    };
    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 360,
        configurable: true,
      });
      fireEvent.scroll(window);
    });
    expect(
      screen.getByRole('link', { name: 'Sobre este especialista' }),
    ).toHaveAttribute('aria-current', 'location');

    // Frame 2 at +450ms (smooth scroll settles at bottom of 1440x900, scrollY = 460, top = 290px > 96px)
    nowSpy.mockReturnValue(1450);
    tops = {
      descripcion: -260,
      opiniones: 20,
      'sobre-el-especialista': 290,
    };
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

    // Manual wheel scroll back up releases the pin and follows the section in view.
    tops = {
      descripcion: 40,
      opiniones: 380,
      'sobre-el-especialista': 680,
    };
    act(() => {
      fireEvent.wheel(window);
      Object.defineProperty(window, 'scrollY', {
        value: 40,
        configurable: true,
      });
      fireEvent.scroll(window);
    });
    expect(screen.getByRole('link', { name: 'Descripción' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    nowSpy.mockRestore();
  });

  it('honors an initial URL hash on mount', async () => {
    window.history.replaceState(null, '', '#sobre-el-especialista');
    try {
      render(<ProfileTabs label="Secciones del perfil" sections={sections} />);
      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: 'Sobre este especialista' }),
        ).toHaveAttribute('aria-current', 'location');
      });
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });
});
