'use client';

import { useTranslations } from 'next-intl';

import { formatAppointmentTime } from '@/app/lib/format/appointment-time';
import {
  dayPartOf,
  type DayPart,
  type DaySlot,
} from '@/app/lib/schemas/availability';
import { cn } from '@/app/lib/utils';

const dayParts: readonly DayPart[] = ['morning', 'afternoon', 'evening'];

/** A day's free hours to choose one from, by morning, afternoon and evening, as the app groups them. */
export function SlotChoices({
  slots,
  selected,
  onSelect,
}: {
  slots: readonly DaySlot[];
  selected: string | null;
  onSelect: (startTime: string) => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      {dayParts.map((part) => {
        const inPart = slots.filter(
          (slot) => dayPartOf(slot.startTime) === part,
        );
        if (inPart.length === 0) return null;
        return (
          <fieldset key={part} className="flex flex-col gap-2">
            <legend className="mb-2 text-label-md text-text-secondary">
              {t(part)}
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {inPart.map((slot) => {
                const startTime = slot.startTime.slice(0, 5);
                return (
                  <label
                    key={startTime}
                    className={cn(
                      // `relative` keeps the hidden radio inside its label,
                      // so focusing it never scrolls the page elsewhere.
                      'relative flex min-h-touch cursor-pointer items-center justify-center rounded-md border-2 border-transparent bg-pure-white px-2 text-body-xs text-text-primary shadow-sm transition-colors duration-fast ease-house',
                      'has-checked:border-primary has-checked:bg-blue-50 has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={startTime}
                      checked={selected === startTime}
                      onChange={() => {
                        onSelect(startTime);
                      }}
                      className="sr-only"
                    />
                    {formatAppointmentTime(startTime)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
