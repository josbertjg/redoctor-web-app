'use client';

import type { ComponentProps } from 'react';

/**
 * The landing's search form, visual until the search exists: a submit (an
 * Enter in a field) stays on the page. It never reloads it with what was
 * typed in the address, browser history and server logs — an illness is
 * health data (AGENTS.md §11).
 */
export function SearchForm(props: ComponentProps<'form'>) {
  return (
    <form
      {...props}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    />
  );
}
