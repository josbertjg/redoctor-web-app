import { Skeleton } from '@/app/ui/skeleton';

/* Placeholders with the final dimensions of each block (zero layout shift). */

export function ReviewsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-6 rounded-xl bg-pure-white p-4 shadow-sm">
        <Skeleton className="size-32 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
          <Skeleton className="h-3 w-3/6" />
          <Skeleton className="h-3 w-2/6" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-60" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export function ProfileHeroSkeleton() {
  return (
    <div className="flex flex-col items-center rounded-b-2xl bg-primary px-gutter pt-2 pb-8">
      <Skeleton className="size-27.5 rounded-full bg-white-50/20" />
      <Skeleton className="mt-4 h-8 w-56 bg-white-50/20" />
      <Skeleton className="mt-2 h-8 w-44 rounded-full bg-white-50/20" />
      <Skeleton className="mt-1.5 h-4 w-48 bg-white-50/20" />
      <Skeleton className="mt-4 h-4 w-40 bg-white-50/20" />
    </div>
  );
}

export function ProfileSectionsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-8 px-gutter py-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-24" />
        <ReviewsSkeleton />
      </div>
    </div>
  );
}
