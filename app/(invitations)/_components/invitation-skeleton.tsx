import { Skeleton } from '@/app/ui/skeleton';

/** The invitation while it loads, in the shape it will take (AGENTS.md §8.2). */
export function InvitationSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-4">
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
      <ClaimSkeleton />
    </div>
  );
}

/** The claim's place while the session answers. */
export function ClaimSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-3 rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-control-lg w-full" />
    </div>
  );
}
