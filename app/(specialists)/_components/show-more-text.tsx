'use client';

import { useState } from 'react';

import { cn } from '@/app/lib/utils';

type ShowMoreTextProps = {
  text: string;
  /** Characters shown before «Leer más» (the app: 200 description, 300 experience). */
  limit: number;
  /** Already translated (i18n: `readMore`, `showLess`). */
  labels: { more: string; less: string };
  className?: string;
};

/** Cuts at the last space before the limit, so no word is split. */
function split(text: string, limit: number) {
  if (text.length <= limit) return null;
  const space = text.lastIndexOf(' ', limit);
  const at = space > limit * 0.6 ? space : limit;
  return { head: text.slice(0, at).trimEnd(), tail: text.slice(at) };
}

/*
 * A long text cut with «… Leer más», as the app's ShowMoreText. The whole
 * text is in the page from the start (search engines read it); the rest is
 * hidden until asked for and fades in when it shows.
 */
export function ShowMoreText({
  text,
  limit,
  labels,
  className,
}: ShowMoreTextProps) {
  const [expanded, setExpanded] = useState(false);
  const parts = split(text, limit);
  const textClass = cn(
    'text-body-xxs whitespace-pre-line text-on-surface',
    className,
  );

  if (parts === null) return <p className={textClass}>{text}</p>;

  return (
    <p className={textClass}>
      {parts.head}
      <span hidden={!expanded} className="animate-fade-in">
        {parts.tail}
      </span>
      {expanded ? ' ' : '… '}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((value) => !value);
        }}
        className="rounded-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {expanded ? labels.less : labels.more}
      </button>
    </p>
  );
}
