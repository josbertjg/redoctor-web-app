'use client';

import { useQuery } from '@tanstack/react-query';

import type { TokenHolder } from '@/app/lib/api/types';
import { specialistPatientsQueryOptions } from '@/app/lib/queries/appointments';
import type { SpecialistPatient } from '@/app/lib/schemas/appointments';

import { useDebouncedValue } from '@/app/hooks/use-debounced-value';

/** The field the specialist is typing in: the document or the names. */
export type PatientSearchOrigin = 'document' | 'name';

/**
 * What each field needs before it asks, as the app's `PatientsSearchCubit`:
 * the API compares a document whole, so fewer digits than the shortest
 * document find nothing; a name matches in part, three letters narrow it.
 */
const minimum: Record<PatientSearchOrigin, number> = { document: 6, name: 3 };

/** The app's pause before a typed term becomes a request. */
const pauseMs = 400;

/*
 * The specialist's registered patients for what is being typed: the
 * document's digits (its letter and dots aside) or the names. Below the
 * field's minimum nothing is asked — saying nothing beats saying there is
 * nobody —; the request goes after the pause; and what an older term found
 * never shows (only the term on screen's answer does). A failure is told
 * in its place, never over the form being filled.
 */
export function usePatientSearch(
  user: TokenHolder,
  term: string,
  origin: PatientSearchOrigin,
): {
  results: SpecialistPatient[];
  searching: boolean;
  failed: boolean;
  /** The API answered for the term on screen: an empty list means nobody. */
  answered: boolean;
} {
  const typed = origin === 'document' ? term.replace(/\D/g, '') : term.trim();
  const settled = useDebouncedValue(typed, pauseMs);
  const enough = typed.length >= minimum[origin];
  const asks = enough && settled === typed;
  const query = useQuery({
    ...specialistPatientsQueryOptions(user, settled),
    enabled: asks,
  });

  return {
    results: asks ? (query.data ?? []) : [],
    searching: enough && (!asks || query.isFetching),
    failed: asks && query.isError,
    answered: asks && query.data !== undefined && !query.isFetching,
  };
}
