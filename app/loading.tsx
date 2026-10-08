import { useTranslations } from 'next-intl';

import { Skeleton } from '@/app/ui/skeleton';

/*
 * Generic fallback while a page that has no loading state of its own renders.
 * Each module ships a skeleton with its page's final dimensions.
 */
export default function Loading() {
  const t = useTranslations('common');

  return (
    <div role="status" className="flex flex-1 flex-col">
      <span className="sr-only">{t('loading')}</span>
      <div className="mx-auto flex w-full max-w-content items-center px-gutter py-3">
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-gutter py-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-4 h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
