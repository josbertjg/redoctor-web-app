'use client';

import AttachMoney from '@material-symbols/svg-400/rounded/attach_money.svg?svgr';
import FormatListBulleted from '@material-symbols/svg-400/rounded/format_list_bulleted.svg?svgr';
import Payments from '@material-symbols/svg-400/rounded/payments.svg?svgr';
import { useQueries } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { formatPrice } from '@/app/lib/format/money';
import { officePricingQueryOptions } from '@/app/lib/queries/offices';
import type { Office, OfficePricing } from '@/app/lib/schemas/offices';

import { Icon } from '@/app/ui/icons';

import { OfficeCard, OfficeResults } from './office-results';
import { ProfileBlock, ProfileBlockEmpty } from './profile-block';

/*
 * «Precios y motivos de consulta», as the app's profile: per office with
 * something to book, whether one price covers every reason or each has its
 * own, and each reason a patient can book with its price.
 */
export function ProfilePrices({
  user,
  offices,
}: {
  user: SessionUser;
  offices: readonly Office[];
}) {
  const t = useTranslations();
  const results = useQueries({
    queries: offices.map((office) =>
      officePricingQueryOptions(user, office.id),
    ),
  });

  return (
    <ProfileBlock title={t('specialistProfile.pricesAndReasons')}>
      <OfficeResults
        offices={offices}
        results={results}
        shows={(pricing) => pricing.reasons.length > 0}
        errorMessage={(office) =>
          t('profile.officePricesError', { office: office.name })
        }
        empty={
          <ProfileBlockEmpty icon={Payments}>
            {t('specialistProfile.addPricesAndReasons')}
          </ProfileBlockEmpty>
        }
      >
        {(office, pricing) => (
          <OfficePrices name={office.name} pricing={pricing} />
        )}
      </OfficeResults>
    </ProfileBlock>
  );
}

function OfficePrices({
  name,
  pricing,
}: {
  name: string;
  pricing: OfficePricing;
}) {
  const t = useTranslations();
  const standard = pricing.mode === 'standard';
  const words = {
    from: (amount: string) => t('priceFormat.from', { amount }),
    rangeShort: (min: string, max: string) =>
      t('priceFormat.rangeShort', { min, max }),
    range: (min: string, max: string) => t('priceFormat.range', { min, max }),
  };

  return (
    <OfficeCard
      name={name}
      badge={
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-secondary px-2.5 py-0.5 text-label-md text-green-700">
          <Icon icon={standard ? AttachMoney : FormatListBulleted} size={16} />
          {standard
            ? t('specialistProfile.standardTariff')
            : t('specialistProfile.perReasonTariff')}
        </span>
      }
    >
      <dl className="flex flex-col divide-y divide-divider">
        {pricing.reasons.map((reason) => (
          <div
            key={reason.id}
            className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <dt className="min-w-0 text-body-md text-text-primary">
              {reason.name}
            </dt>
            <dd className="shrink-0 text-body-md font-semibold text-text-secondary tabular-nums">
              {formatPrice(reason.price, words) ??
                t('specialistProfile.reasonPriceMissing')}
            </dd>
          </div>
        ))}
      </dl>
    </OfficeCard>
  );
}
