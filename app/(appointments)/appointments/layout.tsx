import { RequireSession } from '@/app/ui/auth/require-session';
import { PageFrame } from '@/app/ui/layout/page-frame';

import { AppointmentsSkeleton } from '../_components/appointments-skeleton';

/*
 * `/appointments` (M6) is the patient's own page, so the session comes first
 * (AGENTS.md §3.5): the skeleton stands until `/me` answers, a stranger goes
 * to sign in and comes back, an account with no sign-up behind it goes to
 * sign up, and a specialist without the patient facet gets a way out.
 */
export default function PatientAppointmentsLayout({
  children,
}: LayoutProps<'/appointments'>) {
  return (
    <PageFrame>
      <RequireSession facet="patient" fallback={<AppointmentsSkeleton />}>
        {children}
      </RequireSession>
    </PageFrame>
  );
}
