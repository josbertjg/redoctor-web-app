import type { SearchResult } from '@/app/lib/schemas/search';
import type { Coordinates } from '@/app/lib/search/location';

/*
 * The pins on the results' map, kept apart from React: a pin per result
 * (the nearest office), the point searched from, and which pin stands out.
 * The component calls these from its effects; nothing here renders.
 */

type MarkerLibrary = google.maps.MarkerLibrary;
type Marker = google.maps.marker.AdvancedMarkerElement;

type Pin = { marker: Marker; element: HTMLElement };

export type MarkerHandlers = {
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

const pinClass =
  'relative flex size-8 translate-y-1/2 animate-scale-in cursor-pointer items-center justify-center rounded-full bg-primary text-pure-white shadow-md ring-2 ring-pure-white transition-[scale,background-color] duration-fast ease-house data-active:scale-125 data-active:bg-blue-700';

const crossClass = 'absolute h-3.5 w-1 rounded-full bg-current';

/** A brand-blue circle with a white cross: a consultation's place. */
function createPin(): HTMLElement {
  const pin = document.createElement('div');
  pin.className = pinClass;
  const bar = document.createElement('span');
  bar.className = crossClass;
  const crossbar = document.createElement('span');
  crossbar.className = `${crossClass} rotate-90`;
  pin.append(bar, crossbar);
  return pin;
}

/** The point searched from: a blue dot in a soft halo. */
function createDot(): HTMLElement {
  const dot = document.createElement('div');
  dot.className =
    'size-4 translate-y-1/2 animate-scale-in rounded-full bg-verified ring-4 ring-verified/30';
  return dot;
}

export type MarkerStore = ReturnType<typeof createMarkerStore>;

export function createMarkerStore(
  map: google.maps.Map,
  library: MarkerLibrary,
  handlers: () => MarkerHandlers,
) {
  const pins = new Map<string, Pin>();
  let dot: Marker | null = null;

  return {
    /** One pin per result, kept while the result stays; the rest go. */
    sync(results: readonly SearchResult[], title: (name: string) => string) {
      const keep = new Set(results.map((result) => result.id));
      for (const [id, pin] of pins) {
        if (!keep.has(id)) {
          pin.marker.map = null;
          pins.delete(id);
        }
      }
      for (const result of results) {
        if (pins.has(result.id)) continue;
        const element = createPin();
        const marker = new library.AdvancedMarkerElement({
          map,
          position: result.office.coordinates,
          content: element,
          title: title(result.name),
          gmpClickable: true,
        });
        marker.addEventListener('gmp-click', () => {
          handlers().onSelect(result.id);
        });
        element.addEventListener('mouseenter', () => {
          handlers().onHover(result.id);
        });
        element.addEventListener('mouseleave', () => {
          handlers().onHover(null);
        });
        pins.set(result.id, { marker, element });
      }
    },

    /** The point searched from, or none. */
    place(point: Coordinates | null, title: string) {
      if (dot) {
        dot.map = null;
        dot = null;
      }
      if (point) {
        dot = new library.AdvancedMarkerElement({
          map,
          position: point,
          content: createDot(),
          title,
          zIndex: -1,
        });
      }
    },

    /** The pins of the cards in hand stand out over the rest. */
    highlight(ids: readonly (string | null)[]) {
      const active = new Set(ids);
      for (const [id, pin] of pins) {
        const standsOut = active.has(id);
        if (standsOut) pin.element.setAttribute('data-active', '');
        else pin.element.removeAttribute('data-active');
        pin.marker.zIndex = standsOut ? 2 : 1;
      }
    },

    /** Every pin and the point, as a box to fit the map to. */
    bounds(): google.maps.LatLngBounds | null {
      const bounds = new google.maps.LatLngBounds();
      let any = false;
      for (const pin of pins.values()) {
        const position = pin.marker.position;
        if (position) {
          bounds.extend(position);
          any = true;
        }
      }
      if (dot?.position) {
        bounds.extend(dot.position);
        any = true;
      }
      return any ? bounds : null;
    },

    clear() {
      for (const pin of pins.values()) pin.marker.map = null;
      pins.clear();
      if (dot) dot.map = null;
      dot = null;
    },
  };
}
