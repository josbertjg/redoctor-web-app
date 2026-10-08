import { env } from '../env';
import { ApiError, type ApiErrorKind } from './errors';
import {
  backoffDelay,
  DEFAULT_MAX_RETRIES,
  isReplayable,
  isTransientStatus,
  neverReachedServer,
  retryAfterDelay,
} from './retry';
import { reportApiError } from '../observability/report';
import { apiErrorEnvelopeSchema } from '../schemas/api-error';

import type { HttpMethod } from './types';
import type { z } from 'zod';

/*
 * The one way the web talks to the API (AGENTS.md §5): typed requests,
 * responses parsed with the zod contract, the app's retry policy and
 * failures as `ApiError`. Works on the server (SSR, Server Actions) and in
 * the browser (authenticated flows with the Firebase ID token).
 */

/** Same budget as the app's Dio client (8 s connect / 8 s receive). */
const DEFAULT_TIMEOUT_MS = 8000;

type QueryValue = string | number | boolean | undefined;

export type ApiRequest<T> = {
  method?: HttpMethod;
  /**
   * Route template relative to the API base, with `:name` params:
   * `/specialists/:specialistId/public-profile`. Reports use the template,
   * never the filled path (it may carry a token).
   */
  path: string;
  params?: Record<string, string>;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Firebase ID token of the signed-in person. */
  token?: string;
  /** The contract the 2xx body must satisfy. */
  schema: z.ZodType<T>;
  /** A POST or DELETE that is safe to send twice (e.g. a read over POST). */
  idempotent?: boolean;
  /** Server-side Data Cache options (revalidate, tags). */
  next?: RequestInit['next'];
  cache?: RequestCache;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
};

/*
 * In `next dev` the browser goes through the dev-only rewrite
 * `/api-proxy/* → API_PROXY_TARGET` (next.config.ts) until the API's CORS
 * allows the web (REDOC-362). The server always calls the API directly.
 */
function apiBaseUrl(): string {
  const inBrowser = typeof window !== 'undefined';
  if (inBrowser && process.env.NODE_ENV === 'development') {
    return `${window.location.origin}/api-proxy`;
  }
  return env.NEXT_PUBLIC_API_URL;
}

export function buildApiUrl(
  path: string,
  params: Record<string, string> = {},
  query: Record<string, QueryValue> = {},
): string {
  const filled = path.replace(/:(\w+)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Missing path param :${name}`);
    return encodeURIComponent(value);
  });
  const url = new URL(`${apiBaseUrl().replace(/\/$/, '')}${filled}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Aborts when the caller cancels or the time budget runs out. */
function requestSignal(
  timeoutMs: number,
  callerSignal: AbortSignal | undefined,
): { signal: AbortSignal; timedOut: () => boolean; dispose: () => void } {
  const controller = new AbortController();
  let didTimeOut = false;
  const timer = setTimeout(() => {
    didTimeOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => {
    controller.abort();
  };
  if (callerSignal?.aborted) controller.abort();
  callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    dispose: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    },
  };
}

async function errorFromResponse(
  response: Response,
  method: HttpMethod,
  path: string,
): Promise<ApiError> {
  let envelope: z.infer<typeof apiErrorEnvelopeSchema> | undefined;
  try {
    const parsed = apiErrorEnvelopeSchema.safeParse(await response.json());
    if (parsed.success) envelope = parsed.data;
  } catch {
    // Not JSON (a proxy's HTML page, an empty body): no code to read.
  }
  return new ApiError({
    kind: 'http',
    method,
    path,
    status: response.status,
    code: envelope?.code,
    details: envelope?.details,
  });
}

function report(error: ApiError): ApiError {
  if (error.isReportable) {
    reportApiError({
      method: error.method,
      path: error.path,
      status: error.status,
      code: error.code,
      kind: error.kind,
    });
  }
  return error;
}

export async function apiFetch<T>(request: ApiRequest<T>): Promise<T> {
  const method = request.method ?? 'GET';
  const { path } = request;
  const url = buildApiUrl(path, request.params, request.query);
  const maxRetries = request.maxRetries ?? DEFAULT_MAX_RETRIES;
  const replayable = isReplayable(method, request.idempotent);

  const headers = new Headers({ Accept: 'application/json' });
  if (request.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (request.token) headers.set('Authorization', `Bearer ${request.token}`);

  for (let attempt = 0; ; attempt += 1) {
    const timeout = requestSignal(
      request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      request.signal,
    );
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        signal: timeout.signal,
        ...(request.body === undefined
          ? {}
          : { body: JSON.stringify(request.body) }),
        ...(request.cache === undefined ? {} : { cache: request.cache }),
        ...(request.next === undefined ? {} : { next: request.next }),
      });
    } catch (cause) {
      timeout.dispose();
      if (request.signal?.aborted) {
        throw new ApiError({ kind: 'aborted', method, path, cause });
      }
      const sentNothing = neverReachedServer(cause);
      if (attempt < maxRetries && (replayable || sentNothing)) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      const kind: ApiErrorKind =
        !replayable && !sentNothing
          ? 'uncertain'
          : timeout.timedOut()
            ? 'timeout'
            : 'network';
      throw new ApiError({ kind, method, path, cause });
    }
    timeout.dispose();

    if (!response.ok) {
      if (
        attempt < maxRetries &&
        replayable &&
        isTransientStatus(response.status)
      ) {
        await sleep(
          retryAfterDelay(response.headers.get('Retry-After')) ??
            backoffDelay(attempt),
        );
        continue;
      }
      throw report(await errorFromResponse(response, method, path));
    }

    const body: unknown =
      response.status === 204 ? undefined : await response.json();
    const parsed = request.schema.safeParse(body);
    if (!parsed.success) {
      throw report(
        new ApiError({
          kind: 'invalid-response',
          method,
          path,
          status: response.status,
          cause: parsed.error,
        }),
      );
    }
    return parsed.data;
  }
}
