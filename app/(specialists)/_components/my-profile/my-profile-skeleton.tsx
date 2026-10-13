import { Skeleton } from '@/app/ui/skeleton';

/*
 * «Mi perfil» while it loads: its blocks with their final room, and no
 * words (the layout may show it outside the page's messages).
 */
export function MyProfileSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-5 w-64 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-control w-32 rounded-lg" />
          <Skeleton className="h-control w-40 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-36 rounded-2xl" />
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-pure-white p-5 shadow-md sm:flex-row">
        <Skeleton className="size-24 shrink-0 rounded-full" />
        <div className="flex w-full flex-col items-center gap-3 sm:items-start">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
    </div>
  );
}
