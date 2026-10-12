import { Skeleton } from '@/app/ui/skeleton';

/** The appointment while it loads, in the shape it will take (AGENTS.md §8.2). */
export function AppointmentSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md">
        <div className="flex items-center gap-3">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-divider pt-4">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-pure-white p-5 shadow-md">
        <Skeleton className="h-control-lg w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-control-lg w-full" />
          <Skeleton className="h-control-lg w-full" />
        </div>
      </div>
    </div>
  );
}
