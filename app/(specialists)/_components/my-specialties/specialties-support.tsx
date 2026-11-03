'use client';

import SupportAgent from '@material-symbols/svg-400/rounded/support_agent.svg?svgr';
import { useTranslations } from 'next-intl';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

import { useSupportChannels } from '@/app/hooks/use-support-channels';

/*
 * After a rejection, the way to Redoctor's support, as the app offers it:
 * its main WhatsApp — the first the API publishes — with a message
 * already written; nothing when there is none. Unlike the app's, the
 * message names no one — no specialist, specialty or reason: the link
 * passes through wa.me, outside the chat's encryption, and support sees
 * who writes anyway (AGENTS.md §13, the sign-up's rule).
 */
export function SpecialtiesSupport({
  rejectedCount,
}: {
  rejectedCount: number;
}) {
  const t = useTranslations('mySpecialties');
  const whatsapp =
    useSupportChannels(t('whatsappMessage', { count: rejectedCount }))
      .whatsapp[0] ?? null;
  if (whatsapp === null) return null;

  return (
    <section className="flex animate-fade-up flex-col items-center gap-3 rounded-2xl bg-pure-white p-5 text-center shadow-md">
      <p className="max-w-md text-body-md text-text-secondary">
        {t('supportHint')}
      </p>
      <Button asChild variant="white" size="small" shape="soft">
        <a href={whatsapp.href} target="_blank" rel="noopener noreferrer">
          <Icon icon={SupportAgent} size={18} />
          {t('supportAction')}
        </a>
      </Button>
    </section>
  );
}
