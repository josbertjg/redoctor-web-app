'use client';

import { useId, useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  customRangeProblem,
  maxRangeDays,
  maxYearsBack,
  reportPeriods,
  type DateRange,
  type ReportPeriod,
} from '@/app/lib/reports/period';
import type { Office } from '@/app/lib/schemas/offices';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { SelectField } from '@/app/ui/select-field';
import { TextField } from '@/app/ui/text-field';

export type ReportSelection = {
  period: ReportPeriod;
  range: DateRange;
  /** An office's id, or empty for all of them. */
  office: string;
};

type ReportFiltersProps = {
  selection: ReportSelection;
  today: string;
  offices: readonly Office[];
  onChange: (selection: ReportSelection) => void;
  /** The ranges of the presets, counted from today. */
  rangeOf: (period: Exclude<ReportPeriod, 'custom'>) => DateRange;
};

/*
 * What the statistics look at, as the app's filters: a period — this week,
 * this month (the default), the last 30 days, the last 3 months, this year,
 * or two days the person picks (up to 366 days, never past today) — and the
 * office, when the specialist has more than one.
 */
export function ReportFilters({
  selection,
  today,
  offices,
  onChange,
  rangeOf,
}: ReportFiltersProps) {
  const t = useTranslations('reports');
  const errorId = useId();
  // «Personalizado» opens the two days; they apply with «Aplicar».
  const [picking, setPicking] = useState(selection.period === 'custom');
  const [draft, setDraft] = useState<DateRange>(selection.range);
  const [tried, setTried] = useState(false);
  const problem = customRangeProblem(draft, today);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t('period.label')}
          value={picking ? 'custom' : selection.period}
          options={reportPeriods.map((period) => ({
            value: period,
            label: t(`period.${period}`),
          }))}
          onChange={(event) => {
            const period = event.target.value as ReportPeriod;
            if (period === 'custom') {
              setPicking(true);
              setDraft(selection.range);
              setTried(false);
              return;
            }
            setPicking(false);
            onChange({ ...selection, period, range: rangeOf(period) });
          }}
        />
        {offices.length > 1 ? (
          <SelectField
            label={t('statistics.officeLabel')}
            value={selection.office}
            options={[
              { value: '', label: t('statistics.allOffices') },
              ...offices.map((office) => ({
                value: office.id,
                label: office.name,
              })),
            ]}
            onChange={(event) => {
              onChange({ ...selection, office: event.target.value });
            }}
          />
        ) : null}
      </div>
      {picking ? (
        <form
          noValidate
          className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            if (problem !== null) return;
            onChange({ ...selection, period: 'custom', range: draft });
          }}
        >
          <p className="text-title-md text-text-primary">
            {t('period.customTitle')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              type="date"
              label={t('period.from')}
              value={draft.from}
              max={today}
              aria-describedby={tried && problem ? errorId : undefined}
              onChange={(event) => {
                setDraft({ ...draft, from: event.target.value });
              }}
            />
            <TextField
              type="date"
              label={t('period.to')}
              value={draft.to}
              max={today}
              aria-describedby={tried && problem ? errorId : undefined}
              onChange={(event) => {
                setDraft({ ...draft, to: event.target.value });
              }}
            />
          </div>
          <FieldError
            id={errorId}
            message={
              tried && problem
                ? t(`period.problem.${problem}`, {
                    days: maxRangeDays,
                    years: maxYearsBack,
                  })
                : undefined
            }
          />
          <Button type="submit" shape="soft" className="self-start">
            {t('period.apply')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
