import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import type { PriceWords } from '@/app/lib/format/money';

/** The words around a price's amounts, from the app's `priceFormat.*`, for `formatPrice`. */
export function usePriceWords(): PriceWords {
  const t = useTranslations('priceFormat');
  return useMemo(
    () => ({
      from: (amount) => t('from', { amount }),
      rangeShort: (min, max) => t('rangeShort', { min, max }),
      range: (min, max) => t('range', { min, max }),
    }),
    [t],
  );
}
