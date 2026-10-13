/*
 * The words of app/global-error.tsx, which replaces the whole document when
 * the root layout fails: no next-intl provider is there to give them. A copy
 * instead of the catalog, because Next loads the global error boundary with
 * every page, and importing es.json there shipped every namespace to every
 * page (≈13 KB gzip, AGENTS.md §8.10). A test keeps them equal to es.json.
 */
export const globalErrorMessages = {
  siteName: 'Redoctor',
  title: 'No pudimos cargar esta página',
  description:
    'Puede ser tu conexión o un problema de nuestro lado. Inténtalo de nuevo en un momento.',
  retry: 'Reintentar',
} as const;
