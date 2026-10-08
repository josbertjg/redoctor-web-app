/** Absolute API URL for a handler path, from .env.test (loaded by tests/env.ts). */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error('NEXT_PUBLIC_API_URL is not set for the tests');
  return `${base}${path}`;
}

/** The API's error envelope, as the handlers answer it. */
export function errorEnvelope(code: string, message: string, path = '') {
  return {
    code,
    message,
    timestamp: '2026-10-07T12:00:00.000Z',
    path: `/api/v1${path}`,
    traceId: 'test-trace',
  };
}
