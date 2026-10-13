'use client';

import { useState } from 'react';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { appointmentsQueryOptions } from '@/app/lib/queries/appointments';
import {
  pendingReviewsQueryOptions,
  reviewKeys,
  sortPendingReviews,
} from '@/app/lib/queries/reviews';
import {
  groupAppointments,
  toAppointmentSummary,
  type AppointmentResponse,
} from '@/app/lib/schemas/appointments';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';
import { useSession } from '@/app/hooks/use-session';

import { AppointmentsList } from './appointments-list';
import { AppointmentsSkeleton } from './appointments-skeleton';
import { ReviewWall } from './review-wall';

/*
 * `/appointments` (M6, M7): the session is already there (the layout's
 * guard). The finished consultations still to rate are read first and hold
 * the page until they are rated; if they cannot be read, the list shows
 * anyway, as the app lets the person in. Then the appointments, from the
 * patient's own device.
 */
export function AppointmentsFlow() {
  const { user } = useSession();
  if (user === null) return <AppointmentsSkeleton />;
  return <PatientAppointments user={user} />;
}

function PatientAppointments({ user }: { user: SessionUser }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const pending = useQuery(pendingReviewsQueryOptions(user));
  const list = useQuery(appointmentsQueryOptions(user));
  // What is ahead is decided once per page, like the appointment's actions.
  const [now] = useState(() => new Date());
  // Each rating sent here moves the focus to what comes next — the next
  // consultation, or the list once the wall is done —: the button pressed is gone.
  const [reviewed, setReviewed] = useState(0);
  const view = useFocusHeading(reviewed);

  return (
    // `contents`: a handle for the focus, no box of its own.
    <div ref={view} className="contents">
      {content()}
    </div>
  );

  function content() {
    if (pending.isPending) return <AppointmentsSkeleton />;

    const toRate = pending.data ?? [];
    if (toRate.length > 0) {
      return (
        <ReviewWall
          appointments={sortPendingReviews(toRate).map(toAppointmentSummary)}
          user={user}
          onReviewed={(appointmentId) => {
            queryClient.setQueryData<AppointmentResponse[]>(
              reviewKeys.pending(user.id),
              (current) =>
                (current ?? []).filter(
                  (appointment) => appointment.id !== appointmentId,
                ),
            );
            setReviewed((count) => count + 1);
          }}
        />
      );
    }

    if (list.isPending) return <AppointmentsSkeleton />;

    // Only when there is nothing to show: a failed re-read keeps the list.
    if (list.isLoadingError) {
      return (
        <EmptyState
          tone="error"
          headingLevel={1}
          icon={CloudOff}
          title={t('appointments.list.loadError')}
          description={t('appointments.list.loadErrorDescription')}
          action={
            <Button
              shape="soft"
              loading={list.isFetching}
              onClick={() => {
                void list.refetch();
              }}
            >
              {t('retry')}
            </Button>
          }
        />
      );
    }

    return (
      <AppointmentsList
        groups={groupAppointments(list.data.map(toAppointmentSummary), now)}
      />
    );
  }
}
