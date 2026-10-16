import { Skeleton } from '@/app/ui/skeleton';

const rows = 4;

/**
 * The menu's shape before the inbox is there — while its code or its
 * rows load —: the title and four rows with the final dimensions, so the
 * content swaps in with nothing moving (AGENTS.md §8.2).
 */
export function NotificationsMenuSkeleton({
  withHeader = true,
}: {
  withHeader?: boolean;
}) {
  return (
    <div aria-hidden="true" className="px-2 pb-2">
      {withHeader ? (
        <div className="px-2 pt-5 pb-4">
          <Skeleton className="h-5 w-36" />
        </div>
      ) : null}
      <ul className="flex flex-col">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex gap-3 p-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
