import { Skeleton } from '@/app/ui/skeleton';

/** The panel's home with its final dimensions, before the person is known. */
export function SpecialistHomeSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8 lg:gap-12">
      {/* «Hola,» and the name, on the blue. */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-32 bg-white-50/20 lg:h-12" />
        <Skeleton className="h-11 w-3/4 bg-white-50/20 lg:h-18" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <Skeleton className="h-51 rounded-xl bg-white-50/20" />
        <Skeleton className="h-51 rounded-xl bg-white-50/20" />
      </div>
    </div>
  );
}
