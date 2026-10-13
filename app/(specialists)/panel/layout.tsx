import { PanelFrame } from '@/app/ui/layout/panel-frame';

import { PanelSkeleton } from '../_components/panel-skeleton';

/*
 * The specialist's panel (M14): its home, the agenda, the appointments and
 * the statistics share this frame. It needs a session with the specialist
 * facet (or an admin's account): the skeleton stands until `/me` answers, a
 * signed-out person goes to sign in and comes back, a patient gets a way
 * out. The skeleton is the section's own.
 */
export default function SpecialistPanelLayout({
  children,
}: LayoutProps<'/panel'>) {
  return <PanelFrame fallback={<PanelSkeleton />}>{children}</PanelFrame>;
}
