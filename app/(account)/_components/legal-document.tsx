import type { ReactNode } from 'react';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { supportChannels } from '@/app/lib/support';

import { PageFrame } from '@/app/ui/layout/page-frame';

type LegalDocumentProps = {
  /** The document's namespace under `legal` in the catalog. */
  document: 'terms' | 'privacy' | 'deleteAccount';
  /** The sections, in order (app/(account)/_data/legal-sections.ts). */
  sections: readonly string[];
  /** A table of contents after the introduction (the long documents). */
  contents?: boolean;
};

const linkClass =
  'rounded-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';

const bodyClass = 'mt-3 text-body-lg text-text-primary';

/** A company email that is real, not the catalog's placeholder for the lawyer. */
const isEmail = (value: string) =>
  /^[^\s@[\]]+@[^\s@[\]]+\.[^\s@[\]]+$/.test(value);

/*
 * A legal document (M10): its title and date, an introduction, a table of
 * contents and the sections, every word from the catalog. The bodies are
 * rich messages: paragraphs, lists and bold, plus links to the other legal
 * pages, to the company's email and to the support WhatsApp (the number
 * the environment gives, the message saying nothing about the person).
 * The company's identification is written once (`legal.entity`) and
 * reaches every document as values.
 */
export function LegalDocument({
  document,
  sections,
  contents = true,
}: LegalDocumentProps) {
  const t = useTranslations(`legal.${document}`);
  const tLegal = useTranslations('legal');
  const email = tLegal('entity.email');
  const whatsapp = supportChannels(tLegal('common.whatsappMessage')).whatsapp;

  const values = {
    company: tLegal('entity.name'),
    rif: tLegal('entity.rif'),
    address: tLegal('entity.address'),
    email,
    whatsapp: whatsapp?.number ?? '',
  };
  const tags = {
    p: (chunks: ReactNode) => <p className={bodyClass}>{chunks}</p>,
    ul: (chunks: ReactNode) => (
      <ul className={`${bodyClass} list-disc space-y-2 pl-6`}>{chunks}</ul>
    ),
    ol: (chunks: ReactNode) => (
      <ol className={`${bodyClass} list-decimal space-y-2 pl-6`}>{chunks}</ol>
    ),
    li: (chunks: ReactNode) => <li className="pl-1">{chunks}</li>,
    b: (chunks: ReactNode) => (
      <strong className="font-semibold">{chunks}</strong>
    ),
    terms: (chunks: ReactNode) => (
      <Link href={routes.terms()} className={linkClass}>
        {chunks}
      </Link>
    ),
    privacy: (chunks: ReactNode) => (
      <Link href={routes.privacy()} className={linkClass}>
        {chunks}
      </Link>
    ),
    delete: (chunks: ReactNode) => (
      <Link href={routes.deleteAccount()} className={linkClass}>
        {chunks}
      </Link>
    ),
    mail: (chunks: ReactNode) =>
      isEmail(email) ? (
        <a href={`mailto:${email}`} className={linkClass}>
          {chunks}
        </a>
      ) : (
        <span className="font-semibold">{chunks}</span>
      ),
    support: (chunks: ReactNode) =>
      whatsapp ? (
        <a
          href={whatsapp.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {chunks}
        </a>
      ) : (
        <span>{chunks}</span>
      ),
  };
  // The catalog's keys are typed; a section's are built from its id.
  type Key = Parameters<typeof t>[0];
  type RichKey = Parameters<typeof t.rich>[0];
  const rich = (path: string) =>
    t.rich(path as RichKey, { ...tags, ...values });
  const sectionTitle = (id: string) => t(`sections.${id}.title` as Key);

  return (
    <PageFrame width="content" className="pt-8 lg:pt-12">
      <article>
        <header>
          <h1 className="text-headline-md font-bold text-text-primary sm:text-headline-lg">
            {t('title')}
          </h1>
          <p className="mt-2 text-body-md text-text-secondary">
            {tLegal('common.updated', { date: t('updatedAt') })}
          </p>
        </header>
        <div className="mt-6">{rich('intro')}</div>
        {contents ? (
          <nav
            aria-label={tLegal('common.contents')}
            className="mt-8 rounded-xl bg-surface p-5 sm:p-6"
          >
            <h2 className="text-title-sm font-semibold text-text-primary">
              {tLegal('common.contents')}
            </h2>
            <ol className="mt-3 space-y-1.5 text-body-md sm:columns-2 sm:gap-8">
              {sections.map((id) => (
                <li key={id} className="break-inside-avoid">
                  <a href={`#${id}`} className={linkClass}>
                    {sectionTitle(id)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {sections.map((id) => (
          <section
            key={id}
            id={id}
            aria-labelledby={`${id}-title`}
            className="mt-10 scroll-mt-24"
          >
            <h2
              id={`${id}-title`}
              className="text-title-lg font-bold text-text-primary"
            >
              {sectionTitle(id)}
            </h2>
            {rich(`sections.${id}.body`)}
          </section>
        ))}
      </article>
    </PageFrame>
  );
}
