'use client';

import { usePathname } from 'next/navigation';

import { routes } from '@/app/lib/routes';

import { PanelSurface } from '@/app/ui/layout/panel-surface';

import { AgendaSkeleton } from './agenda-skeleton';
import { HistorySkeleton } from './appointments-history';
import { ReportsSkeleton } from './reports/reports-view';
import { SpecialistHomeSkeleton } from './specialist-home-skeleton';

/*
 * The panel's skeleton while the person is not known yet: the one of the
 * section on screen, so the page that follows takes its place without a
 * jump (AGENTS.md §8.2). One layout frames all of the sections.
 */
export function PanelSkeleton() {
  const pathname = usePathname();
  // The sections with no design of their own on the blue sit on its surface.
  if (pathname.startsWith(routes.agenda())) {
    return (
      <PanelSurface>
        <AgendaSkeleton />
      </PanelSurface>
    );
  }
  if (pathname.startsWith(routes.specialistAppointments())) {
    return (
      <PanelSurface>
        <HistorySkeleton />
      </PanelSurface>
    );
  }
  if (pathname.startsWith(routes.reports())) {
    return (
      <PanelSurface>
        <ReportsSkeleton />
      </PanelSurface>
    );
  }
  if (
    pathname.startsWith(routes.specialistProfile()) ||
    pathname.startsWith(routes.specialties())
  ) {
    return (
      <PanelSurface>
        <SpecialistHomeSkeleton />
      </PanelSurface>
    );
  }
  return <SpecialistHomeSkeleton />;
}
