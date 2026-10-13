'use client';

import { useId, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Lock from '@material-symbols/svg-400/rounded/lock.svg?svgr';
import Person from '@material-symbols/svg-400/rounded/person.svg?svgr';
import Public from '@material-symbols/svg-400/rounded/public.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { track } from '@/app/lib/analytics/track';
import { isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import { reviewKeys, submitReview } from '@/app/lib/queries/reviews';
import type { AppointmentSummary } from '@/app/lib/schemas/appointments';
import {
  reviewCommentMaxLength,
  toReviewBody,
} from '@/app/lib/schemas/reviews';

import { AppointmentHeadline } from '@/app/ui/appointments/appointment-headline';
import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { StarsInput } from '@/app/ui/stars-input';
import { TextArea } from '@/app/ui/text-area';
import { toast } from '@/app/ui/toast';

import { actionFailure } from './action-failure';

type ReviewValues = {
  /** The radio's value, «1» to «5»; nothing chosen until the person chooses. */
  rating: string;
  comment: string;
};

type ReviewFormProps = {
  appointment: AppointmentSummary;
  user: SessionUser;
  onSubmitted: () => void;
};

/*
 * The app's review form (M7): the consultation — who, when, why, where and
 * for whom —, «¿Cómo calificarías la cita?» with five stars, an optional
 * comment with its count, what the person should know (final, public) and
 * «Enviar calificación», never disabled: without a star it says what is
 * missing and sends nothing. The write goes through the write-once guard.
 */
export function ReviewForm({
  appointment,
  user,
  onSubmitted,
}: ReviewFormProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const failureId = useId();

  const schema = useMemo(
    () =>
      z.object({
        rating: z
          .string({ error: t('reviews.rate.ratingRequired') })
          .regex(/^[1-5]$/, t('reviews.rate.ratingRequired')),
        comment: z
          .string()
          .max(
            reviewCommentMaxLength,
            t('reviews.rate.commentTooLong', { max: reviewCommentMaxLength }),
          ),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { comment: '' },
  });

  const submit = useMutation({
    mutationFn: (values: ReviewValues) =>
      submitReview(
        user,
        appointment.id,
        toReviewBody({
          rating: Number(values.rating),
          comment: values.comment,
        }),
      ),
    onSuccess: (_submission, values) => {
      track('web_review_submitted', { comment: values.comment.trim() !== '' });
      const name = appointment.specialist.name;
      toast.success(
        name
          ? t('reviews.rate.thanks', { name })
          : t('reviews.rate.thanksNoName'),
      );
      onSubmitted();
    },
    onError: (error) => {
      // Rated meanwhile, or gone: the pending list says so and the wall
      // moves on, as the app does.
      if (isApiError(error) && (error.status === 404 || error.status === 409)) {
        void queryClient.invalidateQueries({
          queryKey: reviewKeys.pending(user.id),
        });
      }
    },
  });

  const failureKey = submit.error
    ? actionFailure(submit.error, 'reviews.rate.failed')
    : null;
  const { attendee, forDependent } = appointment;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit((values) => {
          if (!submit.isPending) submit.mutate(values);
        })(event);
      }}
    >
      <AppointmentHeadline appointment={appointment} />

      {appointment.reason || appointment.office.name || forDependent ? (
        <section className="flex animate-fade-up flex-col gap-2 rounded-2xl bg-pure-white p-5 shadow-md">
          {appointment.reason ? (
            <Fact icon={Stethoscope}>{appointment.reason}</Fact>
          ) : null}
          {appointment.office.name ? (
            <Fact icon={LocationOn}>{appointment.office.name}</Fact>
          ) : null}
          {forDependent ? (
            <Fact icon={Person}>
              {t('reviews.gate.attendee', {
                name: `${attendee.firstName} ${attendee.lastName}`,
              })}
            </Fact>
          ) : null}
        </section>
      ) : null}

      <section className="flex animate-fade-up flex-col gap-5 rounded-2xl bg-pure-white p-5 shadow-md">
        <StarsInput
          legend={t('reviews.rate.question')}
          inputProps={register('rating')}
          starLabel={(count) => t('reviews.rate.starLabel', { count })}
          error={errors.rating?.message}
        />
        <TextArea
          label={t('reviews.rate.commentLabel')}
          placeholder={t('reviews.rate.commentHint')}
          maxLength={reviewCommentMaxLength}
          showCount
          error={errors.comment?.message}
          {...register('comment')}
        />
        <ul className="flex flex-col gap-2 text-body-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <Icon icon={Lock} size={18} className="mt-0.5 shrink-0" />
            {t('reviews.rate.isFinal')}
          </li>
          <li className="flex items-start gap-2">
            <Icon icon={Public} size={18} className="mt-0.5 shrink-0" />
            {t('reviews.rate.isPublic')}
          </li>
        </ul>
        <div className="flex flex-col gap-2">
          <FieldError
            id={failureId}
            message={failureKey ? t(failureKey) : undefined}
            className="text-center"
          />
          <Button type="submit" block shape="soft" loading={submit.isPending}>
            {t('reviews.rate.submit')}
          </Button>
        </div>
      </section>
    </form>
  );
}

function Fact({
  icon,
  children,
}: {
  icon: IconComponent;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-body-md text-text-secondary">
      <Icon icon={icon} size={20} className="shrink-0 text-primary" />
      {children}
    </p>
  );
}
