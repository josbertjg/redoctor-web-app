'use client';

import type { ComponentProps } from 'react';

import { useTranslations } from 'next-intl';

import { SlotPicker } from '../slot-picker';

type SlotStepProps = ComponentProps<typeof SlotPicker> & {
  /** The hour chosen was taken meanwhile: the app's warning, until another is chosen. */
  slotTaken: boolean;
};

/** The app's second step: the day (the first free one comes chosen) and the hour. */
export function SlotStep({ slotTaken, ...picker }: SlotStepProps) {
  const t = useTranslations('search');

  return (
    <div className="flex flex-col gap-5">
      {slotTaken ? (
        <div
          role="alert"
          className="flex animate-fade-in flex-col gap-1 rounded-xl bg-warning-light px-4 py-3 text-body-sm text-warning-800"
        >
          <p className="font-semibold">{t('slotTakenTitle')}</p>
          <p>{t('slotTakenDescription')}</p>
        </div>
      ) : null}
      <SlotPicker {...picker} />
    </div>
  );
}
