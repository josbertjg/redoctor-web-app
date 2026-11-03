import { cn } from '@/app/lib/utils';

import { Skeleton } from '@/app/ui/skeleton';

import { authSurfaceClass } from './auth-card';

/** The sign-up card with its final dimensions, before the person is known. */
export function SignUpSkeleton() {
  return (
    <div
      aria-busy="true"
      className={cn(authSurfaceClass, 'flex flex-col items-center gap-4.5')}
    >
      <Skeleton className="size-15 rounded-full" />
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="mt-2 h-control-lg w-full" />
      <Skeleton className="h-control-lg w-full" />
      <Skeleton className="mt-3 h-4 w-2/3" />
    </div>
  );
}
