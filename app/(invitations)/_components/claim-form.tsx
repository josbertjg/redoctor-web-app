'use client';

import { useId, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import type { Account } from '@/app/lib/auth/account';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  birthDateProblem,
  earliestBirthDate,
  todayInCaracas,
} from '@/app/lib/format/date-of-birth';
import { appointmentKeys } from '@/app/lib/queries/appointments';
import {
  claimInvitation,
  invitationKeys,
  selfClaimRefusalOf,
} from '@/app/lib/queries/invitations';
import { routes } from '@/app/lib/routes';
import {
  invitationSexes,
  type ClaimBody,
  type ClaimRelationship,
  type Invitation,
  type InvitedSex,
  type SelfClaimRefusal,
} from '@/app/lib/schemas/invitations';

import { Button } from '@/app/ui/button';
import { Checkbox } from '@/app/ui/checkbox';
import { ChoiceCards } from '@/app/ui/choice-cards';
import { FieldError } from '@/app/ui/field-error';
import { wipeScreen } from '@/app/ui/motion/screen-wipe';
import { TextField } from '@/app/ui/text-field';

type ClaimValues = {
  relationship: '' | ClaimRelationship;
  dateOfBirth: string;
  sex: '' | InvitedSex;
  confirm: boolean;
};

type ClaimFormProps = {
  token: string;
  invitation: Invitation;
  user: SessionUser;
  account: Account;
  /** The account has not finished its patient sign-up: that comes first. */
  mustSignUp: boolean;
  /** The answer kept across the sign-up (`?for=`). */
  initialRelationship: ClaimRelationship | null;
  onClaimed: (outcome: { confirmed: boolean }) => void;
  onSwitchAccount: () => void;
};

const refusalKeys = {
  INVITATION_WITHOUT_DOCUMENT: 'invitationWithoutDocument',
  ACCOUNT_WITHOUT_DOCUMENT: 'accountWithoutDocument',
  DOCUMENT_MISMATCH: 'documentMismatch',
} as const satisfies Record<SelfClaimRefusal, string>;

/*
 * The claim (M4), the app's invitation form: for whom the appointment is
 * (only a representative claims one with no document to check), what the
 * invitation lacks of someone in one's care, and the confirmation in the
 * same step when its window is open. It says which account the
 * appointment will go to (AGENTS.md §1), and an account that has not
 * finished its sign-up goes to finish it first, keeping the answer.
 * The button shows the wait inside it and is never disabled (§8.3).
 */
export function ClaimForm({
  token,
  invitation,
  user,
  account,
  mustSignUp,
  initialRelationship,
  onClaimed,
  onSwitchAccount,
}: ClaimFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const formErrorId = useId();
  const [today] = useState(() => todayInCaracas());
  /** The API's refusal of a SELF claim, shown while the same answer stands. */
  const [refusal, setRefusal] = useState<{
    reason: SelfClaimRefusal;
    relationship: ClaimRelationship;
  } | null>(null);

  const { invited, appointment, canBeClaimedAsSelf } = invitation;
  const name = `${invited.firstName} ${invited.lastName}`;
  const asksDateOfBirth = invited.dateOfBirth === null;
  const asksSex = invited.sex === null;
  const offersConfirmation = appointment.canConfirmNow && !mustSignUp;
  // Which account keeps it (AGENTS.md §1): Firebase's address, or the API's
  // when the provider shared none.
  const savedUnder = user.email ?? account.email;

  const resolver = useClaimResolver({
    asksDependentData: !mustSignUp,
    asksDateOfBirth,
    asksSex,
    today,
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClaimValues>({
    resolver,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      relationship: canBeClaimedAsSelf
        ? (initialRelationship ?? '')
        : 'DEPENDENT',
      dateOfBirth: '',
      sex: '',
      confirm: appointment.canConfirmNow,
    },
  });
  // `useWatch`, not `watch`: the React Compiler memoizes this component.
  const relationship = useWatch({ control, name: 'relationship' });

  const signUpFirst = (chosen: ClaimRelationship) => {
    router.push(
      routes.signUp(
        routes.invitation(token, chosen === 'SELF' ? 'self' : 'dependent'),
      ),
    );
  };

  const claim = useMutation({
    mutationFn: ({ body }: { body: ClaimBody }) =>
      claimInvitation(
        { accountId: account.id, getToken: () => user.getToken() },
        token,
        body,
      ),
    onSuccess: (response, { body }) => {
      void queryClient.invalidateQueries({
        queryKey: appointmentKeys.list(user.id),
      });
      // What the API did, not what was asked: an earlier claim of this same
      // account (a second tab, a lost answer) may have left it unconfirmed.
      const confirmed = response.appointment.status === 'CONFIRMED';
      track('web_invitation_claimed', {
        relationship: body.relationship === 'SELF' ? 'self' : 'dependent',
        confirmed,
      });
      // A big moment: the claimed appointment arrives under the green wipe
      // (AGENTS.md §8, rule 13). The button stays busy until then
      // (`isSuccess`): back to its words, it would flash where the colour
      // starts growing.
      void wipeScreen({
        tone: 'success',
        whileCovered: () => {
          queryClient.setQueryData(invitationKeys.detail(token), response);
          // The appointment is now this account's: «Mis citas» and its page
          // read it as it is, not as they were before the claim.
          queryClient.setQueryData(
            appointmentKeys.detail(user.id, response.appointment.id),
            { kind: 'found', appointment: response.appointment },
          );
          onClaimed({ confirmed });
        },
      });
    },
    onError: (error, { body }) => {
      const reason = selfClaimRefusalOf(error);
      if (reason) {
        setRefusal({ reason, relationship: body.relationship });
        return;
      }
      if (
        isApiError(error) &&
        error.status === 403 &&
        error.code === 'ERR_2010'
      ) {
        signUpFirst(body.relationship);
        return;
      }
      // It may have changed meanwhile (expired, claimed elsewhere): the
      // page shows what it is now.
      void queryClient.invalidateQueries({
        queryKey: invitationKeys.detail(token),
      });
    },
  });

  const failureKey =
    claim.error === null || selfClaimRefusalOf(claim.error) !== null
      ? null
      : failureMessageKey(claim.error, 'appointments.invitation.claimFailed');
  const failure = failureKey === null ? undefined : t(failureKey);

  const shownRefusal =
    refusal !== null && refusal.relationship === relationship ? refusal : null;
  const asksDependentData =
    relationship === 'DEPENDENT' && !mustSignUp && (asksDateOfBirth || asksSex);

  return (
    <form
      noValidate
      aria-label={t('appointments.invitation.claim')}
      aria-describedby={failure === undefined ? undefined : formErrorId}
      onSubmit={(event) => {
        void handleSubmit((values) => {
          if (claim.isPending || values.relationship === '') return;
          const chosen = values.relationship;
          if (mustSignUp) {
            signUpFirst(chosen);
            return;
          }
          const body: ClaimBody = { relationship: chosen };
          if (chosen === 'DEPENDENT') {
            if (asksDateOfBirth) body.dateOfBirth = values.dateOfBirth;
            if (asksSex && values.sex !== '') body.sex = values.sex;
          }
          if (offersConfirmation && values.confirm) body.confirm = true;
          claim.mutate({ body });
        })(event);
      }}
      className="flex animate-fade-up flex-col gap-5 rounded-2xl bg-pure-white p-5 shadow-md"
    >
      {canBeClaimedAsSelf ? (
        <ChoiceCards
          legend={t('appointments.invitation.whoIsItFor')}
          columns={1}
          options={[
            {
              value: 'SELF',
              label: t('appointments.invitation.forMe'),
              description: t('appointments.invitation.forMeDescription', {
                name,
              }),
            },
            {
              value: 'DEPENDENT',
              label: t('appointments.invitation.forDependent'),
              description: t(
                'appointments.invitation.forDependentDescription',
                { name },
              ),
            },
          ]}
          inputProps={register('relationship')}
          error={errors.relationship?.message}
        />
      ) : (
        <p className="rounded-xl bg-info-light px-4 py-3 text-body-sm text-blue-800">
          {t('appointments.invitation.onlyAsRepresentative')}
        </p>
      )}

      {asksDependentData ? (
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-text-secondary">
            {t('appointments.invitation.completeDependentData')}
          </p>
          {asksDateOfBirth ? (
            <TextField
              label={t('dateOfBirth')}
              type="date"
              min={earliestBirthDate(today)}
              max={today}
              error={errors.dateOfBirth?.message}
              {...register('dateOfBirth')}
            />
          ) : null}
          {asksSex ? (
            <ChoiceCards
              legend={t('sex')}
              options={invitationSexes.map((sex) => ({
                value: sex,
                label: t(sex === 'MALE' ? 'male' : 'female'),
              }))}
              inputProps={register('sex')}
              error={errors.sex?.message}
            />
          ) : null}
        </div>
      ) : null}

      {offersConfirmation ? (
        <div className="flex flex-col">
          <Checkbox
            label={
              <span className="text-body-md font-semibold">
                {t('appointments.invitation.confirmNow')}
              </span>
            }
            {...register('confirm')}
          />
          <p className="pl-8 text-body-sm text-text-secondary">
            {t('appointments.invitation.confirmNowDescription')}
          </p>
        </div>
      ) : null}

      {shownRefusal ? (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-xl bg-warning-light px-4 py-3 text-body-sm text-warning-800"
        >
          <p className="font-semibold">
            {t('appointments.invitation.documentIssue.title')}
          </p>
          <p>
            {t(
              `appointments.invitation.documentIssue.${refusalKeys[shownRefusal.reason]}`,
            )}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-start gap-1 text-body-md text-text-secondary">
          {savedUnder ? (
            <p className="break-all">
              {t.rich('appointments.invitation.savedUnder', {
                email: savedUnder,
                strong: (chunks) => (
                  <strong className="font-semibold text-text-primary">
                    {chunks}
                  </strong>
                ),
              })}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onSwitchAccount}
            className="min-h-touch rounded-sm text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t('auth.switchAccount')}
          </button>
        </div>
        {mustSignUp ? (
          <p className="text-body-sm text-text-secondary">
            {t('finishPatientSignup.toClaim')}
          </p>
        ) : null}
        <FieldError
          id={formErrorId}
          message={failure}
          className="text-center"
        />
        <Button
          type="submit"
          block
          shape="soft"
          loading={claim.isPending || claim.isSuccess}
        >
          {mustSignUp ? t('continue') : t('appointments.invitation.claim')}
        </Button>
      </div>
    </form>
  );
}

type ResolverInput = {
  /** Someone in one's care with data missing is asked for it (not before the sign-up). */
  asksDependentData: boolean;
  asksDateOfBirth: boolean;
  asksSex: boolean;
  today: string;
};

function useClaimResolver({
  asksDependentData,
  asksDateOfBirth,
  asksSex,
  today,
}: ResolverInput): Resolver<ClaimValues> {
  const t = useTranslations();

  return useMemo(() => {
    const schema = z
      .object({
        relationship: z.enum(['', 'SELF', 'DEPENDENT']),
        dateOfBirth: z.string(),
        sex: z.enum(['', 'MALE', 'FEMALE']),
        confirm: z.boolean(),
      })
      .superRefine((values, context) => {
        if (values.relationship === '') {
          context.addIssue({
            code: 'custom',
            path: ['relationship'],
            message: t('appointments.invitation.chooseWho'),
          });
          return;
        }
        if (values.relationship !== 'DEPENDENT' || !asksDependentData) return;
        if (asksDateOfBirth) {
          const problem = birthDateProblem(values.dateOfBirth, today, {
            adult: false,
          });
          if (problem !== null) {
            context.addIssue({
              code: 'custom',
              path: ['dateOfBirth'],
              message:
                problem === 'empty'
                  ? t('input.empty')
                  : t('input.dateOfBirth.invalid'),
            });
          }
        }
        if (asksSex && values.sex === '') {
          context.addIssue({
            code: 'custom',
            path: ['sex'],
            message: t('input.empty'),
          });
        }
      });
    return zodResolver(schema);
  }, [asksDependentData, asksDateOfBirth, asksSex, today, t]);
}
