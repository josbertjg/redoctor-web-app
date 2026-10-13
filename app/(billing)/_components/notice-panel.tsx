'use client';

import { useId } from 'react';

import ErrorIcon from '@material-symbols/svg-400/rounded/error.svg?svgr';
import HourglassTop from '@material-symbols/svg-400/rounded/hourglass_top.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import SwapHoriz from '@material-symbols/svg-400/rounded/swap_horiz.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatDate, formatDateTime } from '@/app/lib/format/dates';
import {
  noticeNeedsAction,
  type SubscriptionNotice,
  type SubscriptionNoticeKind,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Icon, type IconComponent } from '@/app/ui/icons';

/** The app's tones: waiting in blue, a payment to move in red, a step not taken yet in yellow. */
const looks: Record<
  SubscriptionNoticeKind,
  { icon: IconComponent; className: string }
> = {
  inReview: { icon: HourglassTop, className: 'text-info' },
  pastDue: { icon: ErrorIcon, className: 'text-error' },
  rejected: { icon: ErrorIcon, className: 'text-error' },
  unpaid: { icon: Schedule, className: 'text-warning-700' },
  upgradePending: { icon: SwapHoriz, className: 'text-warning-700' },
};

type NoticePanelProps = {
  notice: SubscriptionNotice;
  onPay: () => void;
};

/*
 * What happens to the plan and the button to sort it out: the app's
 * SubscriptionNoticePanel on «Mi suscripción». A rejected payment shows the
 * admin's reason right under: without it, «vuelve a enviar tu pago» does
 * not say what to correct. Waiting (a payment in review) asks for nothing.
 */
export function NoticePanel({ notice, onPay }: NoticePanelProps) {
  const t = useTranslations('billing.notice');
  const headingId = useId();
  const look = looks[notice.kind];
  const { deadline } = notice;

  const title = (): string => {
    switch (notice.kind) {
      case 'pastDue':
        // With the deadline about to run out, counting days stops helping.
        return notice.days <= 1
          ? t('pastDue.titleImminent')
          : t('pastDue.title', { days: notice.days });
      case 'upgradePending':
        return t('upgradePending.title', { plan: notice.planName ?? '' });
      case 'inReview':
        return t('inReview.title');
      case 'rejected':
        return t('rejected.title');
      case 'unpaid':
        return t('unpaid.title');
    }
  };

  const description = (): string => {
    switch (notice.kind) {
      case 'inReview':
        return t('inReview.description');
      case 'upgradePending':
        return t('upgradePending.description', {
          plan: notice.planName ?? '',
        });
      case 'unpaid': {
        // The 72 h of an unpaid subscription: the hour counts as much as the day.
        const date = deadline ? formatDateTime(deadline) : null;
        return date
          ? t('unpaid.description', { date })
          : t('unpaid.descriptionNoDate');
      }
      case 'pastDue': {
        const date = deadline ? formatDate(deadline) : null;
        return date
          ? t('pastDue.description', { date })
          : t('pastDue.descriptionNoDate');
      }
      case 'rejected': {
        const date = deadline ? formatDate(deadline) : null;
        return date
          ? t('rejected.description', { date })
          : t('rejected.descriptionNoDate');
      }
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <h2
        id={headingId}
        className="flex items-start gap-2 text-title-md text-text-primary"
      >
        <Icon
          icon={look.icon}
          size={24}
          className={cn('shrink-0', look.className)}
        />
        {title()}
      </h2>
      <p className="text-body-md text-text-secondary">{description()}</p>
      {notice.rejectionReason ? (
        <div className="rounded-lg bg-error-light p-3">
          <p className="text-label-md text-error-800">{t('reason')}</p>
          <p className="mt-1 text-body-md whitespace-pre-line text-error-800">
            {notice.rejectionReason}
          </p>
        </div>
      ) : null}
      {noticeNeedsAction(notice) ? (
        <Button block shape="soft" onClick={onPay}>
          {t('payAction')}
        </Button>
      ) : null}
    </section>
  );
}
