import { AppointmentsSkeleton } from '../_components/appointments-skeleton';

/** The page's skeleton while it streams (the same one the session guard shows). */
export default function PatientAppointmentsLoading() {
  return <AppointmentsSkeleton />;
}
