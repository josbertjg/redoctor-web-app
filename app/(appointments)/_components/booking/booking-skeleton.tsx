import { Skeleton } from '@/app/ui/skeleton';

/** The steps' place while the session and the account are read: a step's own shape. */
export function BookingSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-1 w-full rounded-full" />
        <Skeleton className="h-7 w-56" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
      </div>
    </div>
  );
}
