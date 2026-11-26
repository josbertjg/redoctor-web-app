import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { searchResponseSchema, toSearchPage } from '@/app/lib/schemas/search';

import { buildSearchResponse } from '@/tests/factories/search';
import { renderWithPageMessages } from '@/tests/render';

import { ResultsMap } from './results-map';

vi.mock('@/app/lib/public-env', () => ({
  publicEnv: {
    googleMaps: {
      apiKey: 'test-maps-key',
      mapId: 'DEMO_MAP_ID',
    },
  },
}));

const results = () =>
  toSearchPage(searchResponseSchema.parse(buildSearchResponse())).results;

type TestMapsWindow = Window & {
  google?: unknown;
  gm_authFailure?: (() => void) | undefined;
  __redoctorGoogleMapsReady?: (() => void) | undefined;
};

afterEach(() => {
  const win = window as TestMapsWindow;
  delete win.google;
  delete win.gm_authFailure;
  delete win.__redoctorGoogleMapsReady;
  document.head
    .querySelectorAll('script[src*="maps.googleapis.com"]')
    .forEach((el) => {
      el.remove();
    });
});

describe('ResultsMap', () => {
  it('catches synchronous Google Maps marker crashes when key auth fails and never crashes remounts', async () => {
    let brokenRuntime = false;

    class FakeMap {
      addListener() {
        return { remove: () => undefined };
      }
      fitBounds() {
        return undefined;
      }
      getZoom() {
        return 12;
      }
      setZoom() {
        return undefined;
      }
    }

    class FakeBounds {
      private empty = true;
      extend() {
        this.empty = false;
      }
      isEmpty() {
        return this.empty;
      }
    }

    class FakeAdvancedMarkerElement {
      map: unknown;
      content: HTMLElement;
      constructor(opts: { map: unknown; content: HTMLElement }) {
        if (brokenRuntime) {
          // Exact crash Google Maps throws after RefererNotAllowedMapError:
          const broken = undefined as unknown as Record<string, unknown>;
          Object.keys(broken.keys as Record<string, unknown>);
        }
        this.map = opts.map;
        this.content = opts.content;
      }
      addEventListener() {
        return undefined;
      }
    }

    const win = window as TestMapsWindow;
    const installGoogle = () => {
      win.google = {
        maps: {
          LatLngBounds: FakeBounds,
          event: {
            addListenerOnce: () => ({ remove: () => undefined }),
          },
          importLibrary: (name: string) => {
            if (name === 'maps') return Promise.resolve({ Map: FakeMap });
            if (name === 'marker') {
              return Promise.resolve({
                AdvancedMarkerElement: FakeAdvancedMarkerElement,
              });
            }
            return Promise.resolve({});
          },
        },
      };
    };

    const props = {
      results: results(),
      point: null,
      activeId: null,
      selectedId: null,
      onHover: () => undefined,
      onSelect: () => undefined,
      onSearchArea: () => undefined,
    };

    // Visit 1: script loads, then Google fires gm_authFailure and corrupts marker internals.
    const first = renderWithPageMessages(
      <ResultsMap {...props} />,
      pageNamespaces.search,
    );

    installGoogle();
    await act(async () => {
      win.__redoctorGoogleMapsReady?.();
      await Promise.resolve();
    });

    act(() => {
      brokenRuntime = true;
      win.gm_authFailure?.();
    });

    expect(
      await screen.findByText('No pudimos cargar el mapa.'),
    ).toBeInTheDocument();
    first.unmount();

    // Visit 2 (client navigation back to /search or filter change): must NOT throw!
    renderWithPageMessages(<ResultsMap {...props} />, pageNamespaces.search);

    expect(
      await screen.findByText('No pudimos cargar el mapa.'),
    ).toBeInTheDocument();
  });
});
