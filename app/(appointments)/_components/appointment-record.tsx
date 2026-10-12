import ArrowForward from '@material-symbols/svg-400/rounded/arrow_forward.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatAppointmentDay,
  formatAppointmentTime,
  formatInstant,
} from '@/app/lib/format/appointment-time';
import type { AppointmentSummary } from '@/app/lib/schemas/appointments';

import { Icon } from '@/app/ui/icons';

/** Who did it, in the app's words; anyone else is «el sistema». */
const actorKey = (by: string | null) =>
  by === 'PATIENT' ? 'patient' : by === 'SPECIALIST' ? 'specialist' : 'system';

const slotText = (slot: { date: string; startTime: string }) =>
  `${formatAppointmentDay(slot.date)}, ${formatAppointmentTime(slot.startTime)}`;

/*
 * What happened to the appointment, as the app's detail lists it: every
 * reschedule, from which slot (struck out) to which and by whom, and the
 * cancellation, by whom, when and why.
 */
export function AppointmentRecord({
  appointment,
}: {
  appointment: AppointmentSummary;
}) {
  const t = useTranslations('appointments');
  const { rescheduleHistory, cancellation } = appointment;
  if (rescheduleHistory.length === 0 && cancellation === null) return null;
  const cancelledAt = cancellation?.at ? formatInstant(cancellation.at) : null;

  return (
    <div className="flex animate-fade-up flex-col gap-5 rounded-2xl bg-pure-white p-5 shadow-md">
      {rescheduleHistory.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-title-sm text-text-primary">
            {t('detail.rescheduleHistory')}
          </h2>
          <ol className="flex flex-col gap-3">
            {rescheduleHistory.map((move, index) => (
              <li
                // The history is append-only and ordered: its index is stable.
                key={index}
                className="flex flex-col gap-0.5 text-body-sm text-text-secondary"
              >
                <del className="block line-through first-letter:uppercase">
                  {slotText(move.from)}
                </del>
                <ins className="flex items-start gap-1 text-text-primary no-underline">
                  <Icon
                    icon={ArrowForward}
                    size={16}
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  <span className="block first-letter:uppercase">
                    {slotText(move.to)}
                  </span>
                </ins>
                {move.by ? (
                  <p>
                    {t('detail.rescheduledBy', {
                      actor: t(`actor.${actorKey(move.by)}`),
                    })}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {cancellation ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-title-sm text-text-primary">
            {t('detail.cancellation')}
          </h2>
          <dl className="grid gap-1 text-body-sm text-text-secondary">
            {cancellation.by ? (
              <div>
                <dt className="inline">{t('detail.cancelledBy')}: </dt>
                <dd className="inline text-text-primary">
                  {t(`actor.${actorKey(cancellation.by)}`)}
                </dd>
              </div>
            ) : null}
            {cancelledAt ? (
              <div>
                <dt className="inline">{t('detail.cancelledAt')}: </dt>
                <dd className="inline text-text-primary">
                  {cancelledAt.day}, {cancelledAt.time}
                </dd>
              </div>
            ) : null}
            {cancellation.reason ? (
              <div>
                <dt className="inline">{t('detail.cancelReason')}: </dt>
                <dd className="inline text-text-primary">
                  {cancellation.reason}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
