import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  buildSpecialistPatients,
  specialistPatientIds,
} from '@/tests/factories/appointments';
import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';
import { specialistUser } from '@/tests/panel';

import {
  usePatientSearch,
  type PatientSearchOrigin,
} from './use-patient-search';

function renderSearch(term: string, origin: PatientSearchOrigin) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    (props: { term: string; origin: PatientSearchOrigin }) =>
      usePatientSearch(specialistUser, props.term, props.origin),
    { wrapper, initialProps: { term, origin } },
  );
}

describe('usePatientSearch', () => {
  it('asks nothing below what each field needs', async () => {
    let asked = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/specialist/patients')) asked += 1;
    });
    const { result } = renderSearch('12345', 'document');
    await new Promise((resolve) => setTimeout(resolve, 600));
    server.events.removeAllListeners();

    expect(asked).toBe(0);
    expect(result.current).toEqual({
      results: [],
      searching: false,
      failed: false,
      answered: false,
    });
  });

  it('finds by the whole document, and by a name from three letters', async () => {
    const byDocument = renderSearch('V-12.345.678', 'document');
    await waitFor(() => {
      expect(
        byDocument.result.current.results.map((patient) => patient.userId),
      ).toEqual([specialistPatientIds.laura]);
    });

    expect(byDocument.result.current.answered).toBe(true);

    const byName = renderSearch('jor', 'name');
    expect(byName.result.current.searching).toBe(true);
    await waitFor(() => {
      expect(
        byName.result.current.results.map((patient) => patient.userId),
      ).toEqual([specialistPatientIds.jorge]);
    });
  });

  it('never shows what an older term found', async () => {
    server.use(
      http.get(
        apiUrl('/scheduling/specialist/patients'),
        async ({ request }) => {
          const search = new URL(request.url).searchParams.get('search') ?? '';
          if (search === 'lau') await delay(300);
          return HttpResponse.json({
            patients: buildSpecialistPatients().filter((patient) =>
              patient.firstName.toLowerCase().startsWith(search),
            ),
          });
        },
      ),
    );
    const { result, rerender } = renderSearch('lau', 'name');
    // Laura's search is on its way when the term changes.
    await new Promise((resolve) => setTimeout(resolve, 450));
    rerender({ term: 'jor', origin: 'name' });

    expect(result.current.results).toEqual([]);
    await waitFor(() => {
      expect(result.current.results.map((patient) => patient.userId)).toEqual([
        specialistPatientIds.jorge,
      ]);
    });
  });

  it('says it answered when nobody matches, so the form can say so', async () => {
    const { result } = renderSearch('zzz', 'name');
    await waitFor(() => {
      expect(result.current.answered).toBe(true);
    });
    expect(result.current.results).toEqual([]);
  });
});
