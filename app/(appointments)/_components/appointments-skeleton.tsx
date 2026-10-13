import { Skeleton } from '@/app/ui/skeleton';

/** The patient's appointments while they load, in the shape they will take (AGENTS.md §8.2). */
export function AppointmentsSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-4">
      <Skeleton className="h-8 w-40" />
      {/* The tabs are a touch target tall, the cards hold when, who, why and where. */}
      <div className="flex gap-4 border-b border-divider">
        <Skeleton className="my-3 h-5 flex-1" />
        <Skeleton className="my-3 h-5 flex-1" />
      </div>
      <ul className="flex flex-col gap-3">
        {[0, 1, 2].map((item) => (
          <li key={item}>
            <Skeleton className="h-40 rounded-2xl" />
          </li>
        ))}
      </ul>
    </div>
  );
}
