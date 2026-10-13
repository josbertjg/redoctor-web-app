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

/** The agenda's page before the person is known: title, tabs, the day, its list. */
export function AgendaSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-touch w-full" />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <AppointmentListSkeleton />
    </div>
  );
}
