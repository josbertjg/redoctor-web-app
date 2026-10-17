import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { nextNavigation } from './navigation-events';
import { NavigationProgress } from './navigation-progress';

const location = vi.hoisted(() => ({ pathname: '/panel', search: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => location.pathname,
  useSearchParams: () => new URLSearchParams(location.search),
}));

function link(href: string, attributes: Record<string, string> = {}) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.textContent = 'Ir';
  for (const [name, value] of Object.entries(attributes)) {
    anchor.setAttribute(name, value);
  }
  // A link the router handles: it never reloads the page here.
  anchor.addEventListener('click', (event) => {
    event.preventDefault();
  });
  document.body.append(anchor);
  return anchor;
}

function line(container: HTMLElement) {
  const node = container.querySelector<HTMLElement>('.nav-progress');
  if (!node) throw new Error('No line');
  return node;
}

beforeEach(() => {
  vi.useFakeTimers();
  location.pathname = '/panel';
  location.search = '';
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.nativeTransition;
});

describe('NavigationProgress', () => {
  it('shows the line when a page takes a while, and finishes it when the page lands', () => {
    const { container, rerender } = render(<NavigationProgress />);
    const progress = line(container);
    expect(progress).toHaveAttribute('data-state', 'idle');

    link('/panel/reports').click();
    // A page that lands this fast shows no line at all.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(progress).toHaveAttribute('data-state', 'idle');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(progress).toHaveAttribute('data-state', 'loading');

    location.pathname = '/panel/reports';
    rerender(<NavigationProgress />);
    expect(progress).toHaveAttribute('data-state', 'done');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(progress).toHaveAttribute('data-state', 'idle');
  });

  it('leaves out links that do not change the page here', () => {
    const { container } = render(<NavigationProgress />);
    const progress = line(container);

    link('https://wa.me/584227362867').click();
    link('/panel/reports', { target: '_blank' }).click();
    link('/panel/reports', { download: '' }).click();
    // The page on screen already (jsdom's own address).
    link(window.location.href).click();
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(progress).toHaveAttribute('data-state', 'idle');
  });

  it('tells whoever waits that a page landed', async () => {
    const { rerender } = render(<NavigationProgress />);
    const landed = nextNavigation(1000);

    location.search = 'status=open';
    rerender(<NavigationProgress />);

    await expect(landed).resolves.toBe(true);
  });

  it('keeps the page transition out of the way of Safari’s own swipe back', () => {
    const { rerender } = render(<NavigationProgress />);
    const swipe = new PopStateEvent('popstate');
    Object.defineProperty(swipe, 'hasUAVisualTransition', { value: true });

    window.dispatchEvent(swipe);
    expect(document.documentElement).toHaveAttribute('data-native-transition');

    location.pathname = '/panel/agenda';
    rerender(<NavigationProgress />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(document.documentElement).not.toHaveAttribute(
      'data-native-transition',
    );
  });
});
