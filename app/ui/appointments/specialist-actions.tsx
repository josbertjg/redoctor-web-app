'use client';

import { useId, useState, type ReactNode } from 'react';

import Autorenew from '@material-symbols/svg-400/rounded/autorenew.svg?svgr';
import Close from '@material-symbols/svg-400/rounded/close.svg?svgr';
import PersonOff from '@material-symbols/svg-400/rounded/person_off.svg?svgr';
import Share from '@material-symbols/svg-400/rounded/share.svg?svgr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { failureMessageKey } from '@/app/lib/api/errors';
import { copyText } from '@/app/lib/clipboard';
import { withOrigin } from '@/app/lib/deep-links';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  formatAppointmentDay,
  formatAppointmentTime,
  hourAgreement,
} from '@/app/lib/format/appointment-time';
import { staleQueryKeys } from '@/app/lib/notifications/effects';
import { publicEnv } from '@/app/lib/public-env';
import {
  appointmentInvitationQueryOptions,
  appointmentKeys,
  cancelAsSpecialist,
  completeAppointment,
} from '@/app/lib/queries/appointments';
import { routes } from '@/app/lib/routes';
import {
  specialistOffer,
  type AppointmentResponse,
  type AppointmentSummary,
  type SpecialistOffer,
} from '@/app/lib/schemas/appointments';
import { whatsappLink } from '@/app/lib/support';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { Sheet, type SheetStep } from '@/app/ui/sheet';
import { Skeleton } from '@/app/ui/skeleton';
import { toast } from '@/app/ui/toast';

import { useRescheduleStep } from './reschedule-sheet';

type SpecialistActionsOptions = {
  appointment: AppointmentSummary;
  user: SessionUser;
  /** The moment the offer is judged at, fixed by the page. */
  now: Date;
  /**
   * Anything more the page does with the appointment the API left after a
   * change; the caches hold it already.
   */
  onChanged?: (appointment: AppointmentResponse) => void;
};

/** A close that asks first: finishing the consultation, marking a no-show, cancelling. */
type Closing = 'complete' | 'noShow' | 'cancel';

/** A step the actions open: a close to confirm, the reschedule, the invitation. */
export type SpecialistStep = Closing | 'reschedule' | 'share';

/** Each closing's words: the sheet, its button, and what is said once done. */
const closings = {
  complete: {
    title: 'appointments.detail.completeAppointment',
    confirm: 'appointments.detail.completeAppointment',
    warning: 'appointments.detail.completeWarning',
    doneTitle: 'appointments.detail.completedTitle',
    doneDescription: 'appointments.detail.completedDescription',
  },
  noShow: {
    title: 'appointments.detail.markNoShow',
    confirm: 'appointments.detail.markNoShow',
    warning: 'appointments.detail.noShowWarning',
    doneTitle: 'appointments.detail.noShowTitle',
    doneDescription: 'appointments.detail.noShowDescription',
  },
  cancel: {
    title: 'appointments.detail.cancelTitle',
    confirm: 'appointments.detail.cancelAppointment',
    warning: 'appointments.detail.cancelWarningSpecialist',
    doneTitle: 'appointments.detail.cancelledTitle',
    doneDescription: 'appointments.detail.cancelledDescriptionSpecialist',
  },
} as const;

const isClosing = (step: SpecialistStep): step is Closing =>
  step === 'complete' || step === 'noShow' || step === 'cancel';

export type SpecialistActionsModel = {
  offer: SpecialistOffer;
  /** The buttons the offer gives; null when it gives none. */
  actions: ReactNode;
  /** The step on screen, or null. */
  step: SpecialistStep | null;
  /** What the step puts in its sheet; the last one while it slides away. */
  content: SheetStep;
  /** Back to the buttons, unless a write is on its way. */
  closeStep: () => void;
  /** A write on its way: the sheet stays until the API answers. */
  pending: boolean;
};

/*
 * What a specialist can do with their patient's appointment, as the app
 * offers it (`specialistOffer`): on its day or up to a day after it ends,
 * «Finalizar consulta» and «No asistió»; while it has not ended,
 * «Reprogramar» and «Cancelar»; while nobody claimed it, «Compartir
 * invitación». Each opens a step — the irreversible ones ask first, in the
 * app's words — that the page shows in a sheet of its own
 * (`SpecialistActions`) or inside the sheet it already is (the agenda's
 * appointment, one sheet at a time). The answer goes into the caches and
 * is said as a toast.
 */
export function useSpecialistActions({
  appointment,
  user,
  now,
  onChanged,
}: SpecialistActionsOptions): SpecialistActionsModel {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const offer = specialistOffer(appointment, now);
  const [step, setStep] = useState<SpecialistStep | null>(null);
  /** The step asked for last, kept while its sheet slides away (§8.2). */
  const [shown, setShown] = useState<SpecialistStep>('complete');
  const problemId = useId();

  // The page shows the appointment the API answered; the agenda, the
  // history and the statistics read again, as a notice about it would have
  // them (effects.ts): this tab sees no echo of its own writes.
  const changed = (response: AppointmentResponse) => {
    queryClient.setQueryData(appointmentKeys.detail(user.id, appointment.id), {
      kind: 'found',
      appointment: response,
    });
    for (const queryKey of [
      appointmentKeys.specialistLists(user.id),
      ...staleQueryKeys('statistics', user.id),
    ]) {
      void queryClient.invalidateQueries({ queryKey });
    }
    onChanged?.(response);
  };

  const close = useMutation({
    mutationFn: (kind: Closing) =>
      kind === 'cancel'
        ? cancelAsSpecialist(user, appointment.id)
        : completeAppointment(user, appointment.id, {
            noShow: kind === 'noShow',
          }),
    onSuccess: (response, kind) => {
      changed(response);
      setStep(null);
      toast.success(t(closings[kind].doneTitle), {
        description: t(closings[kind].doneDescription),
      });
    },
    onError: () => {
      // Out of time or already changed: what the API holds now is read again.
      void queryClient.invalidateQueries({
        queryKey: appointmentKeys.detail(user.id, appointment.id),
      });
    },
  });

  const reschedule = useRescheduleStep({
    appointment,
    user,
    as: 'specialist',
    enabled: step === 'reschedule',
    onRescheduled: (response) => {
      changed(response);
      setStep(null);
    },
  });
  const share = useShareInvitationStep({
    appointment,
    user,
    enabled: step === 'share',
  });

  const open = (next: SpecialistStep) => {
    if (isClosing(next)) close.reset();
    if (next === 'reschedule') reschedule.reset();
    setShown(next);
    setStep(next);
  };
  const pending = close.isPending || reschedule.pending;
  const closeStep = () => {
    if (!pending) setStep(null);
  };

  const failureKey =
    close.error === null
      ? null
      : failureMessageKey(close.error, 'appointments.detail.actionFailed');
  const time = formatAppointmentTime(appointment.startTime);

  const content: SheetStep = isClosing(shown)
    ? {
        title: t(closings[shown].title),
        body: (
          <p className="text-body-md text-text-secondary">
            {shown === 'cancel'
              ? t(closings.cancel.warning, {
                  name: `${appointment.attendee.firstName} ${appointment.attendee.lastName}`.trim(),
                  date: formatAppointmentDay(appointment.date),
                  time,
                  hour: hourAgreement(time),
                })
              : t(closings[shown].warning)}
          </p>
        ),
        footer: (
          <div className="flex flex-col gap-2">
            <FieldError
              id={problemId}
              message={failureKey === null ? undefined : t(failureKey)}
              className="text-center"
            />
            <Button
              block
              shape="soft"
              variant={shown === 'cancel' ? 'error' : 'primary'}
              loading={close.isPending}
              aria-describedby={failureKey === null ? undefined : problemId}
              onClick={() => {
                if (close.isPending) return;
                close.mutate(shown);
              }}
            >
              {t(closings[shown].confirm)}
            </Button>
            <Button block shape="soft" variant="white" onClick={closeStep}>
              {t('appointments.detail.keep')}
            </Button>
          </div>
        ),
      }
    : shown === 'reschedule'
      ? reschedule
      : share;

  const visible = offer.closeOut || offer.upcoming || offer.shareInvitation;
  const actions = visible ? (
    <div className="flex flex-col gap-3">
      {offer.closeOut ? (
        <Button
          block
          shape="soft"
          onClick={() => {
            open('complete');
          }}
        >
          {t('appointments.detail.completeAppointment')}
        </Button>
      ) : null}
      {offer.closeOut || offer.upcoming ? (
        <div className="grid auto-cols-fr grid-flow-col gap-2">
          {offer.closeOut ? (
            <RowAction
              icon={PersonOff}
              label={t('appointments.detail.markNoShow')}
              onClick={() => {
                open('noShow');
              }}
            />
          ) : null}
          {offer.upcoming ? (
            <>
              <RowAction
                icon={Autorenew}
                label={t('appointments.detail.reschedule')}
                tone="accent"
                onClick={() => {
                  open('reschedule');
                }}
              />
              <RowAction
                icon={Close}
                label={t('cancel')}
                tone="error"
                onClick={() => {
                  open('cancel');
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}
      {offer.closeOut ? (
        <p className="text-center text-body-sm text-text-secondary">
          {t('appointments.detail.closeOutHint')}
        </p>
      ) : null}
      {offer.shareInvitation ? (
        <Button
          variant="white"
          shape="soft"
          block
          onClick={() => {
            open('share');
          }}
        >
          <Icon icon={Share} size={20} />
          {t('appointments.detail.shareInvitation')}
        </Button>
      ) : null}
    </div>
  ) : null;

  return { offer, actions, step, content, closeStep, pending };
}

type SpecialistActionsProps = SpecialistActionsOptions & {
  className?: string;
};

/*
 * The specialist's actions on a page (the appointment's, `/a/{id}`): the
 * buttons where the page puts them, each step in a sheet of its own. The
 * sheet stays mounted when the buttons go (a consultation just closed has
 * nothing left to do): it leaves with its animation.
 */
export function SpecialistActions({
  className,
  ...options
}: SpecialistActionsProps) {
  const { actions, step, content, closeStep } = useSpecialistActions(options);

  return (
    <>
      {actions ? <div className={className}>{actions}</div> : null}
      <Sheet
        open={step !== null}
        onOpenChange={(open) => {
          if (!open) closeStep();
        }}
        title={content.title}
        description={content.description}
        footer={content.footer}
      >
        {content.body}
      </Sheet>
    </>
  );
}

/** One of the frame's row buttons: its icon over its name, in its tone. */
function RowAction({
  icon,
  label,
  tone = 'plain',
  onClick,
}: {
  icon: IconComponent;
  label: string;
  tone?: 'plain' | 'accent' | 'error';
  onClick: () => void;
}) {
  return (
    <Button
      shape="soft"
      variant={tone === 'error' ? 'error' : 'white'}
      onClick={onClick}
      className={cn(
        'h-auto min-h-touch flex-col gap-0.5 px-2 py-2 text-label-md',
        // The app's tones (`_StackedAction`): the no-show in grey, the
        // reschedule in orange on its tint (orange-500 on orange-50).
        tone === 'plain' && 'text-grey-600',
        tone === 'accent' && 'bg-orange-50 text-orange-500 hover:bg-orange-100',
      )}
    >
      <Icon icon={icon} size={18} />
      {label}
    </Button>
  );
}

/*
 * The invitation's link for a patient with no account, for the specialist
 * to send themselves (the app's «Enviar invitación por WhatsApp»): the
 * app's message — the day, the hour, the office and the link — without the
 * patient's name, since the text travels in wa.me's address. The link as
 * the app builds it (the token leads; the API's own URL, an old path,
 * REDOC-255, only when no token came), tagged with the channel it goes by.
 */
export function useShareInvitationStep({
  appointment,
  user,
  enabled,
}: {
  /** None yet (a booking still to make): the step waits for it. */
  appointment: AppointmentSummary | null;
  user: SessionUser;
  enabled: boolean;
}): SheetStep {
  const t = useTranslations();
  const link = useQuery({
    ...appointmentInvitationQueryOptions(user, appointment?.id ?? ''),
    enabled: enabled && appointment !== null,
  });
  const token = link.data?.token ?? null;
  const url =
    token === null
      ? (link.data?.url ?? null)
      : new URL(routes.invitation(token), publicEnv.siteUrl).toString();
  const phone = link.data?.phone ?? null;
  if (appointment === null) {
    return { title: t('appointments.detail.shareInvitation'), body: null };
  }
  const time = formatAppointmentTime(appointment.startTime);
  const linkLine = appointment.canConfirmNow
    ? t('appointments.messages.invitation.linkConfirmNow')
    : appointment.confirmationOpensAt
      ? t('appointments.messages.invitation.linkConfirmLater')
      : t('appointments.messages.invitation.link');
  const message = (channelUrl: string) =>
    [
      t('appointments.messages.greetingNoName'),
      t('appointments.messages.invitation.intro'),
      t('appointments.messages.date', {
        date: formatAppointmentDay(appointment.date),
      }),
      t('appointments.messages.time', { time }),
      ...(appointment.office.name
        ? [
            t('appointments.messages.place', {
              office: appointment.office.name,
            }),
          ]
        : []),
      '',
      linkLine,
      t('appointments.messages.pinnedLink', { link: channelUrl }),
      '',
      t('appointments.messages.invitation.closing'),
    ].join('\n');

  return {
    title: t('appointments.detail.shareInvitation'),
    description: t('appointments.detail.shareInvitationHint'),
    body: link.isPending ? (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-control-lg w-full" />
        <Skeleton className="h-control-lg w-full" />
      </div>
    ) : link.isError || url === null ? (
      <p className="text-body-md text-text-secondary">
        {t('appointments.detail.invitationLoadError')}
      </p>
    ) : (
      <div className="flex animate-fade-in flex-col gap-3">
        <p className="rounded-lg bg-surface px-3 py-2 text-body-sm break-all text-text-primary select-all">
          {url}
        </p>
        {phone !== null ? (
          <Button asChild block shape="soft">
            <a
              href={whatsappLink(
                phone,
                message(withOrigin(url, 'whatsapp-invitation')),
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('appointments.detail.sendByWhatsapp')}
            </a>
          </Button>
        ) : null}
        <Button
          block
          shape="soft"
          variant="white"
          onClick={() => {
            // The app shares the whole message; here it is copied whole.
            void copyText(message(withOrigin(url, 'share-invitation'))).then(
              (copied) => {
                if (copied) {
                  toast.success(t('appointments.detail.messageCopied'));
                } else {
                  toast.error(t('appointments.detail.copyFailed'));
                }
              },
            );
          }}
        >
          {t('appointments.detail.copyMessage')}
        </Button>
      </div>
    ),
  };
}
