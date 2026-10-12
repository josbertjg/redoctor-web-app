import { Skeleton } from '@/app/ui/skeleton';

/** The sign-up card with its final dimensions, before the person is known. */
export function SignUpSkeleton() {
  return (
    <div
      aria-busy="true"
      className="w-full max-w-md rounded-2xl bg-pure-white p-6 shadow-md sm:p-8"
    >
      <Skeleton className="mx-auto h-8 w-3/4" />
      <Skeleton className="mx-auto mt-3 h-5 w-full" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="mt-4 h-11 w-full" />
      <Skeleton className="mt-2 h-11 w-full" />
      <Skeleton className="mt-6 h-control-lg w-full" />
    </div>
  );
}
