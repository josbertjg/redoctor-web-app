import Image from 'next/image';

import { useTranslations } from 'next-intl';

import type { SpecialistProfile } from '@/app/lib/schemas/specialists';

/*
 * The specialist's photos, as the app's gallery: 200 px squares in a row that
 * scrolls sideways. They load straight from where the API stores them
 * (`unoptimized`): their hosts are not this web's to choose.
 */
export function Gallery({
  images,
  name,
}: {
  images: SpecialistProfile['gallery'];
  name: string;
}) {
  const t = useTranslations('specialists');

  return (
    <div
      role="region"
      aria-label={t('galleryLabel', { name })}
      // A scrollable region must be reachable with the keyboard (axe:
      // scrollable-region-focusable), so this region takes the focus.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="-mx-gutter flex snap-x gap-2 overflow-x-auto px-gutter pb-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {images.map((image, index) => (
        <Image
          key={`${String(index)}-${image.url}`}
          src={image.url}
          alt={image.alt ?? t('galleryPhoto', { position: index + 1, name })}
          width={200}
          height={200}
          unoptimized
          className="size-50 shrink-0 snap-start rounded-sm bg-surface-variant object-cover"
        />
      ))}
    </div>
  );
}
