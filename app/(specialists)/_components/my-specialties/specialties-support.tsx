'use client';

import SupportAgent from '@material-symbols/svg-400/rounded/support_agent.svg?svgr';
import { useTranslations } from 'next-intl';

import { supportChannels } from '@/app/lib/support';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

/*
 * After a rejection, the way to Redoctor's support, as the app offers it:
 * its WhatsApp with a message already written. Unlike the app's, the
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
  const { whatsapp } = supportChannels(
    t('whatsappMessage', { count: rejectedCount }),
  );
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
