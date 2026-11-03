'use client';

import { useId } from 'react';

import Mail from '@material-symbols/svg-400/rounded/mail.svg?svgr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import {
  notificationKeys,
  notificationPreferencesQueryOptions,
  updateNotificationPreferences,
} from '@/app/lib/queries/notifications';
import type { NotificationPreferences } from '@/app/lib/schemas/notifications';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Checkbox } from '@/app/ui/checkbox';
import { FieldError } from '@/app/ui/field-error';
import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

/*
 * Whether the daily summary also comes by email (REDOC-359; the owner's
 * call of 2026-11-02 — the app has no such switch yet): the email's own
 * link turns it off, and this is where it comes back. The summary's push
 * cannot be turned off. Read and saved in the browser with the person's
 * token; the box stays clickable while it saves (§8.3).
 */
export function PanelSummaryEmail({ className }: { className?: string }) {
  const { user } = useSession();
  if (user === null) return null;
  return <SummaryEmail user={user} className={className} />;
}

function SummaryEmail({
  user,
  className,
}: {
  user: SessionUser;
  className?: string | undefined;
}) {
  const t = useTranslations('panel.home.dailySummary');
  const tRoot = useTranslations();
  const queryClient = useQueryClient();
  const headingId = useId();
  const failureId = useId();
  const preferences = useQuery(notificationPreferencesQueryOptions(user));
  const save = useMutation({
    mutationFn: (next: NotificationPreferences) =>
      updateNotificationPreferences(user, next),
    onSuccess: (saved) => {
      queryClient.setQueryData(notificationKeys.preferences(user.id), saved);
    },
  });

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex animate-fade-up flex-col gap-2 rounded-2xl bg-pure-white p-5 shadow-md',
        className,
      )}
    >
      <h2
        id={headingId}
        className="flex items-center gap-2 text-title-md text-text-primary"
      >
        <Icon icon={Mail} size={24} className="shrink-0 text-primary" />
        {t('title')}
      </h2>
      <p className="text-body-md text-text-secondary">{t('description')}</p>
      {preferences.isPending ? (
        <Skeleton className="h-touch w-56" />
      ) : preferences.isError ? (
        <div className="flex animate-fade-in flex-wrap items-center gap-3">
          <p className="text-body-sm text-text-secondary">{t('loadFailed')}</p>
          <Button
            variant="white"
            size="small"
            shape="soft"
            loading={preferences.isFetching}
            onClick={() => {
              void preferences.refetch();
            }}
          >
            {tRoot('retry')}
          </Button>
        </div>
      ) : (
        <div className="flex animate-fade-in flex-col">
          <Checkbox
            label={t('label')}
            // What is being saved shows at once; the API's answer settles it.
            checked={
              save.isPending
                ? save.variables.dailySummaryEmail
                : preferences.data.dailySummaryEmail
            }
            aria-describedby={save.isError ? failureId : undefined}
            onChange={(event) => {
              if (save.isPending) return;
              save.mutate({ dailySummaryEmail: event.target.checked });
            }}
          />
          <FieldError
            id={failureId}
            message={save.isError ? t('failed') : undefined}
          />
        </div>
      )}
    </section>
  );
}
