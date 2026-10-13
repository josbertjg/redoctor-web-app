import { PanelFrame } from '@/app/ui/layout/panel-frame';

import { PaySkeleton } from '../../_components/pay-skeleton';

/*
 * The subscription's two pages (M13) live in the specialist's panel: «Mi
 * suscripción» and the payment, in a reading column. The panel's frame
 * brings the bar, the sections and the session: the skeleton stands until
 * `/me` answers, a stranger goes to sign in and comes back, a patient gets a
 * way out.
 */
export default function SubscriptionLayout({
  children,
}: LayoutProps<'/panel/subscription'>) {
  return (
    <PanelFrame width="narrow" fallback={<PaySkeleton />}>
      {children}
    </PanelFrame>
  );
}
