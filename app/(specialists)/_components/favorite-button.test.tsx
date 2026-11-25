import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import {
  buildMeResponse,
  buildNewAccountMeResponse,
  buildSpecialistMeResponse,
  patientFacet,
} from '@/tests/factories/identity';
import { knownSpecialistId } from '@/tests/factories/specialists';
import { apiUrl } from '@/tests/msw/api-url';
import { favoriteSpecialistId } from '@/tests/msw/handlers/favorites';
import { validToken } from '@/tests/msw/handlers/identity';
import { server } from '@/tests/msw/server';
import { renderWithPageMessages } from '@/tests/render';

import {
  noSession,
  SessionContext,
  type Session,
} from '@/app/hooks/use-session';

import { FavoriteButton } from './favorite-button';

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => navigation,
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function signedIn(me = buildMeResponse()): Session {
  return {
    status: 'signed-in',
    expected: true,
    user: {
      id: 'uid-1',
      email: 'ana@example.com',
      name: 'Ana Pérez',
      photo: null,
      provider: 'google',
      getToken: () => Promise.resolve(validToken),
    },
    account: toAccount(meResponseSchema.parse(me)),
    accountStatus: 'ready',
    accountError: null,
    accountRetrying: false,
    retryAccount: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    addSignOutTask: () => () => undefined,
    firebaseReady: true,
    prepareSignIn: () => undefined,
  };
}

function renderHeart(session: Session, specialistId = knownSpecialistId) {
  return renderWithPageMessages(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SessionContext.Provider value={session}>
        <FavoriteButton specialistId={specialistId} />
      </SessionContext.Provider>
    </QueryClientProvider>,
    pageNamespaces.specialistProfile,
  );
}

/**
 * The API with a memory, as the real one: what it keeps is what it lists
 * after. Gives back what it was asked to keep or let go, in order.
 */
function keepingApi() {
  const kept = new Set<string>();
  const writes: string[] = [];
  const page = () =>
    HttpResponse.json({
      favorites: [...kept].map((specialistId) => ({ specialistId })),
      meta: { total: kept.size, page: 1, limit: 100, totalPages: 1 },
    });
  server.use(
    http.get(apiUrl('/patients/favorites/'), page),
    http.post(apiUrl('/patients/favorites/'), async ({ request }) => {
      const { specialistId } = (await request.json()) as {
        specialistId: string;
      };
      kept.add(specialistId);
      writes.push('POST');
      return HttpResponse.json(
        { favorite: { specialistId, favoritedAt: new Date().toISOString() } },
        { status: 201 },
      );
    }),
    http.delete(apiUrl('/patients/favorites/:specialistId'), ({ params }) => {
      const removed = kept.delete(String(params.specialistId));
      writes.push('DELETE');
      return HttpResponse.json({ removed });
    }),
  );
  return writes;
}

describe('FavoriteButton', () => {
  it('keeps the specialist among the patient’s favourites, and lets them go', async () => {
    const writes = keepingApi();
    renderHeart(signedIn());

    const heart = await screen.findByRole('button', {
      name: 'Guardar en favoritos',
    });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(heart);
    // At once, the API told after.
    expect(
      await screen.findByRole('button', { name: 'Quitar de favoritos' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(writes).toEqual(['POST']);
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar de favoritos' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Guardar en favoritos' }),
    ).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => {
      expect(writes).toEqual(['POST', 'DELETE']);
    });
  });

  it('starts pressed for a specialist the patient keeps already', async () => {
    renderHeart(signedIn(), favoriteSpecialistId);
    expect(
      await screen.findByRole('button', { name: 'Quitar de favoritos' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('puts the heart back when the API refuses', async () => {
    server.use(
      http.post(apiUrl('/patients/favorites/'), () =>
        HttpResponse.json({ code: 'ERR_9999', message: 'No' }, { status: 500 }),
      ),
    );
    renderHeart(signedIn());

    await userEvent.click(
      await screen.findByRole('button', { name: 'Guardar en favoritos' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Guardar en favoritos' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('asks a visitor to sign in, in the app’s words', async () => {
    renderHeart(noSession);

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar en favoritos' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'Tus especialistas de confianza',
    });
    expect(
      within(sheet).getByRole('button', { name: /Google/ }),
    ).toBeInTheDocument();
  });

  it('shows no heart to a specialist', () => {
    renderHeart(signedIn(buildSpecialistMeResponse()));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets a patient with open personal data keep a favourite without bouncing to sign-up when the API accepts it', async () => {
    navigation.push.mockClear();
    const writes = keepingApi();
    renderHeart(
      signedIn(
        buildMeResponse({
          registrationStatus: 'PENDING_COMPLETE_PATIENT',
          profiles: {
            patient: patientFacet({ status: 'PENDING_PERSONAL_DATA' }),
            specialist: { exists: false },
          },
        }),
      ),
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Guardar en favoritos' }),
    );
    expect(navigation.push).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(writes).toEqual(['POST']);
    });
  });

  it('sends a patient to finish sign-up with ?favorite=1 when the API demands complete registration (ERR_2010)', async () => {
    navigation.push.mockClear();
    server.use(
      http.get(apiUrl('/patients/favorites/'), () =>
        HttpResponse.json(
          { code: 'ERR_2010', message: 'Registration incomplete' },
          { status: 403 },
        ),
      ),
      http.post(apiUrl('/patients/favorites/'), () =>
        HttpResponse.json(
          { code: 'ERR_2010', message: 'Registration incomplete' },
          { status: 403 },
        ),
      ),
    );
    renderHeart(
      signedIn(
        buildMeResponse({
          registrationStatus: 'PENDING_COMPLETE_PATIENT',
          profiles: {
            patient: patientFacet({ status: 'PENDING_PERSONAL_DATA' }),
            specialist: { exists: false },
          },
        }),
      ),
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Guardar en favoritos' }),
    );
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        `/sign-up?redirect=${encodeURIComponent(`/s/${knownSpecialistId}?favorite=1`)}`,
      );
    });
  });

  it('sends a brand-new account to sign up with ?favorite=1, and keeps the specialist on the way back', async () => {
    navigation.push.mockClear();
    renderHeart(signedIn(buildNewAccountMeResponse()));

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar en favoritos' }),
    );
    expect(navigation.push).toHaveBeenCalledWith(
      `/sign-up?redirect=${encodeURIComponent(`/s/${knownSpecialistId}?favorite=1`)}`,
    );

    const writes = keepingApi();
    window.history.replaceState(null, '', `/s/${knownSpecialistId}?favorite=1`);
    renderHeart(signedIn());
    await waitFor(() => {
      expect(writes).toEqual(['POST']);
    });
    expect(window.location.search).toBe('');
  });
});
