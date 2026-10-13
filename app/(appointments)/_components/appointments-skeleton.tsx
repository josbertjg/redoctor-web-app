import { Skeleton } from '@/app/ui/skeleton';

/** The patient's appointments while they load, in the shape they will take (AGENTS.md §8.2). */
export function AppointmentsSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-4">
      <Skeleton className="h-8 w-40" />
      <div className="flex gap-4 border-b border-divider pb-3">
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-5 flex-1" />
      </div>
      <ul className="flex flex-col gap-3">
        {[0, 1, 2].map((item) => (
          <li key={item}>
            <Skeleton className="h-32 rounded-2xl" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The same, standing for the whole page before the person is known. */
export function AppointmentsPageSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-gutter pt-6 pb-16">
      <AppointmentsSkeleton />
    </main>
  );
}
