import { Skeleton } from '@/app/ui/skeleton';

/** A list of the specialist's appointments while it loads, cards of their final height. */
export function AppointmentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul aria-busy="true" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <Skeleton className="h-36 rounded-2xl" />
        </li>
      ))}
    </ul>
  );
}

/** «Citas» while its appointments load: the white card the day or the week fills. */
export function AgendaBodySkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-4 rounded-2xl bg-pure-white p-4 shadow-md sm:p-6"
    >
      <Skeleton className="h-8 w-56" />
      <AppointmentListSkeleton />
    </div>
  );
}

/** «Citas» before the person is known: its title, its bar and its card, on the blue. */
export function AgendaSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5 lg:gap-6">
      <Skeleton className="h-10 w-40 bg-blue-400 lg:h-16" />
      <div className="flex flex-wrap gap-2.5">
        <Skeleton className="h-touch w-16 rounded-lg bg-blue-400" />
        <Skeleton className="h-touch w-24 rounded-lg bg-blue-400" />
        <Skeleton className="h-touch w-44 rounded-lg bg-blue-400" />
      </div>
      <AgendaBodySkeleton />
    </div>
  );
}
