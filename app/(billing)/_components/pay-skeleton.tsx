import { Skeleton } from '@/app/ui/skeleton';

/** The specialist's billing while it loads, in the shape it will take (AGENTS.md §8.2). */
export function PaySkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-control-lg rounded-lg" />
    </div>
  );
}

/** The same, standing for the whole page before the person is known. */
