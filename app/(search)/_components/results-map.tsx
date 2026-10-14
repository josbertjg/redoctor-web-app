'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  googleMapId,
  importMapsLibrary,
  onMapsAuthFailure,
} from '@/app/lib/maps/google-maps';
import type { SearchResult } from '@/app/lib/schemas/search';
import {
  distanceBetween,
  radiusCovering,
  roundCoordinates,
  venezuelaCenter,
  type Coordinates,
  type SearchRadius,
} from '@/app/lib/search/location';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Skeleton } from '@/app/ui/skeleton';

import { createMarkerStore, type MarkerStore } from './map-markers';

/*
 * The results on a Google map: a pin on each specialist's nearest office,
 * the point searched from, and — once the map has been moved — «Buscar en
 * esta zona», which searches from the map's middle as far as the map
 * shows. The pin of the card under the pointer stands out, and a pin
 * tapped tells the list which card to show. The API loads when the map
 * first mounts, never before, with the page's nonce (app/lib/maps).
 */

type ResultsMapProps = {
  results: readonly SearchResult[];
  /** Where the search looked from; null for the whole country. */
  point: Coordinates | null;
  activeId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onSearchArea: (center: Coordinates, radius: SearchRadius) => void;
  className?: string;
};

/** One pin alone would zoom to the street: the neighbourhood is enough. */
const closestZoom = 15;

export function ResultsMap({
  results,
  point,
  activeId,
  selectedId,
  onHover,
  onSelect,
  onSearchArea,
  className,
}: ResultsMapProps) {
  const t = useTranslations('search.web');
  const container = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<{
    map: google.maps.Map;
    markers: MarkerStore;
  } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(
    'loading',
  );
  const [moved, setMoved] = useState(false);
  const fitting = useRef(false);
  const handlers = useRef({ onHover, onSelect });

  useEffect(() => {
    handlers.current = { onHover, onSelect };
  });

  // The map itself, once: the API arrives in its own time.
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const gone = new AbortController();
    let markers: MarkerStore | null = null;
    // A key Google refuses for this API: the map says so, in our words.
    const stopListening = onMapsAuthFailure(() => {
      if (!gone.signal.aborted) setStatus('failed');
    });
    void (async () => {
      try {
        const [maps, library] = await Promise.all([
          importMapsLibrary('maps'),
          importMapsLibrary('marker'),
        ]);
        if (gone.signal.aborted) return;
        const map = new maps.Map(node, {
          mapId: googleMapId(),
          center: venezuelaCenter,
          zoom: 6,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        map.addListener('dragend', () => {
          setMoved(true);
        });
        map.addListener('zoom_changed', () => {
          if (!fitting.current) setMoved(true);
        });
        markers = createMarkerStore(map, library, () => handlers.current);
        setScene({ map, markers });
        setStatus('ready');
      } catch {
        if (!gone.signal.aborted) setStatus('failed');
      }
    })();
    return () => {
      gone.abort();
      stopListening();
      markers?.clear();
    };
  }, []);

  // The pins and the point follow the results; then the map shows them all.
  useEffect(() => {
    if (!scene) return;
    scene.markers.sync(results, (name) => t('officePin', { name }));
    scene.markers.place(point, t('yourLocation'));
    const bounds = scene.markers.bounds();
    if (!bounds) return;
    fitting.current = true;
    scene.map.fitBounds(bounds, 56);
    const once = google.maps.event.addListenerOnce(scene.map, 'idle', () => {
      if ((scene.map.getZoom() ?? 0) > closestZoom) {
        scene.map.setZoom(closestZoom);
      }
      fitting.current = false;
      setMoved(false);
    });
    return () => {
      once.remove();
    };
  }, [scene, results, point, t]);

  // The pin of the card in hand stands out.
  useEffect(() => {
    scene?.markers.highlight([activeId, selectedId]);
  }, [scene, activeId, selectedId, results]);

  const searchArea = () => {
    if (!scene) return;
    const center = scene.map.getCenter();
    const bounds = scene.map.getBounds();
    if (!center || !bounds) return;
    const middle = { lat: center.lat(), lng: center.lng() };
    const corner = bounds.getNorthEast();
    const reach = distanceBetween(middle, {
      lat: corner.lat(),
      lng: corner.lng(),
    });
    setMoved(false);
    onSearchArea(roundCoordinates(middle), radiusCovering(reach));
  };

  return (
    <div
      className={cn('relative overflow-hidden bg-surface-variant', className)}
    >
      {/* Hidden, not unmounted, once Google refuses: its error panel sits inside. */}
      <div
        ref={container}
        role="application"
        aria-label={t('mapLabel')}
        aria-hidden={status === 'failed' || undefined}
        className={cn('size-full', status === 'failed' && 'invisible')}
      />
      {status === 'loading' ? (
        <Skeleton className="absolute inset-0 rounded-none" />
      ) : null}
      {status === 'failed' ? (
        <p className="absolute inset-0 flex items-center justify-center px-gutter text-center text-body-md text-text-secondary">
          {t('mapUnavailable')}
        </p>
      ) : null}
      <div
        className={cn(
          'absolute inset-x-0 top-3 flex justify-center transition-[opacity,translate] duration-base ease-house',
          moved
            ? 'opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0',
        )}
      >
        <Button
          variant="white"
          size="small"
          onClick={searchArea}
          tabIndex={moved ? 0 : -1}
          aria-hidden={!moved}
        >
          {t('searchThisArea')}
        </Button>
      </div>
    </div>
  );
}
