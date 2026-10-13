import '@testing-library/jest-dom/vitest';
import { createElement } from 'react';

import type { ImageProps } from 'next/image';

import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';

import { server } from './msw/server';

// The environment is loaded before this file, by tests/env.ts.

expect.extend(toHaveNoViolations);

// next/image needs the Next.js server; in unit tests it is a plain <img>.
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    preload: _preload,
    sizes: _sizes,
    quality: _quality,
    placeholder: _placeholder,
    blurDataURL: _blurDataURL,
    unoptimized: _unoptimized,
    loader: _loader,
    ...rest
  }: ImageProps) =>
    createElement('img', {
      src:
        typeof src === 'string'
          ? src
          : 'default' in src
            ? src.default.src
            : src.src,
      alt,
      ...rest,
    }),
}));

// jsdom has no matchMedia; libraries read it for reduced motion and viewport.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

// jsdom lays nothing out, so it has no scrollIntoView; the sheets call it.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = () => undefined;
}

beforeAll(() => {
  // Every API call in a unit test goes through MSW; an unmocked one fails.
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  // Sonner keeps toasts in a module-level store and replays the active ones
  // to the next Toaster that mounts: one test's toast must not reach another.
  toast.dismiss();
  server.resetHandlers();
  // A test that listened to the requests (to read their bodies) stops here.
  server.events.removeAllListeners();
});

afterAll(() => {
  server.close();
});
