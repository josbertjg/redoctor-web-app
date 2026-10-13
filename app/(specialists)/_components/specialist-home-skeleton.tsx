import { Skeleton } from '@/app/ui/skeleton';

/** The specialist's page with its final dimensions, before the person is known. */
export function SpecialistHomeSkeleton() {
  return (
    <div aria-busy="true">
      {/* On a phone the title takes two lines and the description three. */}
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="mt-1 h-9 w-1/2 sm:hidden" />
      <Skeleton className="mt-3 h-5 w-full" />
      <Skeleton className="mt-1 h-5 w-full sm:hidden" />
      <Skeleton className="mt-1 h-5 w-2/3" />
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <li key={item}>
            <Skeleton className="h-20 rounded-2xl" />
          </li>
        ))}
      </ul>
    </div>
  );
}
