'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import FavoriteFill from '@material-symbols/svg-400/rounded/favorite-fill.svg?svgr';
import Favorite from '@material-symbols/svg-400/rounded/favorite.svg?svgr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { TokenHolder } from '@/app/lib/api/types';
import {
  canUseSpecialistArea,
  mustFinishPatientSignup,
  needsSignUp,
} from '@/app/lib/auth/account';
import {
  addFavorite,
  favoriteKeys,
  favoritesQueryOptions,
  removeFavorite,
} from '@/app/lib/queries/favorites';
import { routes } from '@/app/lib/routes';

import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { SignInLegalNote } from '@/app/ui/auth/sign-in-legal-note';
import { Icon } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';
import { toast } from '@/app/ui/toast';

import { useSession } from '@/app/hooks/use-session';

const noSession: TokenHolder = {
  id: '',
  getToken: () => Promise.reject(new Error('No session yet')),
};

/*
 * The profile's heart (Figma, 2026-11-16): the specialist kept among the
 * patient's favourites, the app's «Favoritos» (`/patients/favorites`). It
 * moves at once and the API is told after; a refusal puts it back and says
 * so. A visitor is asked to sign in right there, with the app's words, and
 * the specialist is kept once in; a patient whose sign-up is open finishes
 * it first. Specialists keep no favourites: no heart for them.
 */
export function FavoriteButton({ specialistId }: { specialistId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, user, account } = useSession();
  const [askSignIn, setAskSignIn] = useState(false);
  // A visitor pressed it: kept once they are in.
  const wanted = useRef(false);

  const patient =
    user !== null &&
    account !== null &&
    !canUseSpecialistArea(account) &&
    !needsSignUp(account) &&
    !mustFinishPatientSignup(account);
  const list = useQuery({
    ...favoritesQueryOptions(user ?? noSession),
    enabled: patient,
  });
  const kept = list.data?.includes(specialistId) ?? false;

  const toggle = useMutation({
    mutationFn: (keep: boolean) => {
      if (user === null) throw new Error('Favourites need the session');
      return keep
        ? addFavorite(user, specialistId)
        : removeFavorite(user, specialistId);
    },
    onMutate: async (keep) => {
      if (user === null) return undefined;
      const key = favoriteKeys.list(user.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);
      queryClient.setQueryData<string[]>(key, (ids = []) =>
        keep
          ? [...ids.filter((id) => id !== specialistId), specialistId]
          : ids.filter((id) => id !== specialistId),
      );
      return { previous };
    },
    onError: (_error, _keep, context) => {
      if (user !== null && context) {
        queryClient.setQueryData(favoriteKeys.list(user.id), context.previous);
      }
      toast.error(t('favorites.failed'));
    },
    onSettled: () => {
      if (user === null) return;
      void queryClient.invalidateQueries({
        queryKey: favoriteKeys.list(user.id),
      });
    },
  });

  // In from the sheet, the list read: the specialist kept, as was asked.
  useEffect(() => {
    if (!wanted.current || !patient || !list.isSuccess) return;
    wanted.current = false;
    if (!kept) toggle.mutate(true);
  }, [patient, list.isSuccess, kept, toggle]);

  if (account !== null && canUseSpecialistArea(account)) return null;

  return (
    <>
      <button
        type="button"
        aria-pressed={kept}
        aria-label={kept ? t('favorites.remove') : t('favorites.add')}
        onClick={() => {
          if (status === 'signed-out') {
            wanted.current = true;
            setAskSignIn(true);
            return;
          }
          if (user === null || account === null) return;
          if (needsSignUp(account) || mustFinishPatientSignup(account)) {
            router.push(routes.signUp(routes.specialist(specialistId)));
            return;
          }
          toggle.mutate(!kept);
        }}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-pure-white shadow-sm transition-[scale,background-color] duration-fast ease-house outline-none hover:scale-105 hover:bg-blue-600 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Icon icon={kept ? FavoriteFill : Favorite} size={24} />
      </button>
      <Sheet
        open={askSignIn}
        onOpenChange={(open) => {
          setAskSignIn(open);
          if (!open && status === 'signed-out') wanted.current = false;
        }}
        title={t('favorites.noAuthTitle')}
        description={t('favorites.noAuthDescription')}
      >
        <div className="flex flex-col gap-4 pb-2">
          <SignInButtons
            onSignedIn={() => {
              setAskSignIn(false);
            }}
          />
          <SignInLegalNote />
        </div>
      </Sheet>
    </>
  );
}
