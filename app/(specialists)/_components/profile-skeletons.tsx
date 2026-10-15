import { Skeleton } from '@/app/ui/skeleton';

/*
 * The reviews' placeholder, with their final dimensions (zero layout shift):
 * they stream in behind the profile, under their own Suspense. The profile
 * itself has no skeleton: it is read before anything goes out, so an unknown
 * id is a real 404 (AGENTS.md §4).
 */
export function ReviewsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
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
      {/* The reviews themselves, up to the five the page shows. */}
      <ul className="flex flex-col gap-5">
        {[0, 1, 2, 3, 4].map((item) => (
          <li key={item} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </li>
        ))}
      </ul>
    </div>
  );
}
