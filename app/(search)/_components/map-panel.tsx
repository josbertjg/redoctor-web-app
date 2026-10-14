'use client';

import { useState } from 'react';

import Link from 'next/link';

import Close from '@material-symbols/svg-400/rounded/close.svg?svgr';
import MapIcon from '@material-symbols/svg-400/rounded/map.svg?svgr';
import { useTranslations } from 'next-intl';

import { googleMapsAvailable } from '@/app/lib/maps/google-maps';
import { routes } from '@/app/lib/routes';
import type { SearchResult } from '@/app/lib/schemas/search';
import type { Coordinates, SearchRadius } from '@/app/lib/search/location';
import { cn } from '@/app/lib/utils';

import { Avatar } from '@/app/ui/avatar';
import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';

import { ResultsMap } from './results-map';

type MapPanelProps = {
  results: readonly SearchResult[];
  point: Coordinates | null;
  activeId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onSearchArea: (center: Coordinates, radius: SearchRadius) => void;
};

/*
 * Where the map lives: beside the list from laptops up, staying put as
 * the list scrolls; on phones, behind a «Mapa» button that opens it as a
 * sheet. A pin tapped shows its specialist on the map itself, with the
 * way to the profile — the list may be far below. Without a key for
 * Google Maps there is no map, and the list has the width.
 */
export function MapPanel({
  results,
  point,
  activeId,
  selectedId,
  onHover,
  onSelect,
  onSearchArea,
}: MapPanelProps) {
  const t = useTranslations('search.web');
  const [open, setOpen] = useState(false);
  if (!googleMapsAvailable() || results.length === 0) return null;
  const selected = results.find((result) => result.id === selectedId) ?? null;

  const map = (className: string) => (
    <div className={cn('relative', className)}>
      <ResultsMap
        results={results}
        point={point}
        activeId={activeId}
        selectedId={selectedId}
        onHover={onHover}
        onSelect={onSelect}
        onSearchArea={onSearchArea}
        className="size-full"
      />
      {selected ? (
        <SelectedCard
          result={selected}
          onClose={() => {
            onSelect(null);
          }}
        />
      ) : null}
    </div>
  );

  return (
    <>
      {/* Laptops and up: beside the list. */}
      <aside
        aria-label={t('map')}
        className="hidden lg:sticky lg:top-24 lg:block lg:h-[calc(100dvh-7.5rem)] lg:self-start"
      >
        {map('h-full overflow-hidden rounded-2xl shadow-md')}
      </aside>
      {/* Phones and tablets: a button, and the map as a sheet. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),--spacing(4))] z-20 flex justify-center lg:hidden">
        <Button
          variant="primary"
          size="small"
          onClick={() => {
            setOpen(true);
          }}
          className="pointer-events-auto shadow-lg"
        >
          <Icon icon={MapIcon} size={20} />
          {t('map')}
        </Button>
      </div>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t('map')}
        className="sm:max-w-2xl"
      >
        {open
          ? map('-mx-gutter h-[62dvh] overflow-hidden sm:mx-0 sm:rounded-xl')
          : null}
      </Sheet>
    </>
  );
}

/** The specialist whose pin was tapped, on the map, with the way to the profile. */
function SelectedCard({
  result,
  onClose,
}: {
  result: SearchResult;
  onClose: () => void;
}) {
  const t = useTranslations();
  return (
    <section
      aria-label={t('search.web.selectedOnMap')}
      className="absolute inset-x-3 bottom-3 z-10 flex animate-fade-up items-center gap-3 rounded-2xl bg-pure-white p-3 shadow-lg"
    >
      <Avatar name={result.name} src={result.photoUrl} size="md" decorative />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-label-lg text-text-primary">
          {result.name}
        </p>
        <p className="truncate text-body-sm text-text-secondary">
          {result.specialties.map((specialty) => specialty.name).join(', ') ||
            result.office.name}
        </p>
      </div>
      <Link
        href={routes.specialist(result.id)}
        aria-label={t('search.web.seeProfileOf', { name: result.name })}
        className="inline-flex h-control shrink-0 items-center rounded-full bg-primary px-4 text-label-lg text-on-primary shadow-xs transition-colors duration-fast ease-house outline-none hover:bg-blue-600 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {t('search.web.seeProfile')}
      </Link>
      <button
        type="button"
        aria-label={t('search.web.closeSelected')}
        onClick={onClose}
        className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-house outline-none hover:bg-surface-variant focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Icon icon={Close} size={18} />
      </button>
    </section>
  );
}
