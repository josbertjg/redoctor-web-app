'use client';

import { PageError, type PageErrorProps } from '@/app/ui/page-error';

/* A page that failed to render, in its own `main` (app/ui/page-error.tsx). */
export default function ErrorPage(props: PageErrorProps) {
  return (
    <main className="flex flex-1 flex-col justify-center pb-16">
      <PageError {...props} />
    </main>
  );
}
