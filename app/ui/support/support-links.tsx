import Call from '@material-symbols/svg-400/rounded/call.svg?svgr';
import Chat from '@material-symbols/svg-400/rounded/chat.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  hasSupport,
  type SupportChannel,
  type SupportChannels,
} from '@/app/lib/support';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

type SupportLinksProps = {
  channels: SupportChannels;
  /** The sections' headings, «Escríbenos» and «Llámanos»; none inside a short block. */
  headingLevel?: 2 | 3 | null;
  /** The WhatsApp lines as the main action (`primary`) or as the others (`white`). */
  whatsappVariant?: 'primary' | 'white';
  className?: string;
};

/*
 * Redoctor's support lines as the app lists them (SupportChannelsList):
 * write by WhatsApp, or call, each line with its label and its number as
 * the admin wrote them (REDOC-357). With no line at all there is nothing:
 * the page offers no way to support. Used on the server and in the
 * browser alike; it fades in, since in the browser the lines arrive after
 * the page.
 */
export function SupportLinks({
  channels,
  headingLevel = 3,
  whatsappVariant = 'primary',
  className,
}: SupportLinksProps) {
  const t = useTranslations('support');
  if (!hasSupport(channels)) return null;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  const text = (channel: SupportChannel) =>
    channel.label
      ? t('channel', { label: channel.label, number: channel.number })
      : channel.number;
  const name = (channel: SupportChannel) =>
    channel.label ? `${channel.label}, ${channel.number}` : channel.number;

  return (
    <div className={cn('flex animate-fade-in flex-col gap-5', className)}>
      {channels.whatsapp.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          {headingLevel === null ? null : (
            <Heading className="text-title-sm text-text-primary">
              {t('writeSection')}
            </Heading>
          )}
          {channels.whatsapp.map((channel) => (
            <Button
              key={channel.href}
              asChild
              block
              shape="soft"
              variant={whatsappVariant}
            >
              <a
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('whatsappTo', { name: name(channel) })}
              >
                <Icon icon={Chat} size={20} />
                {text(channel)}
              </a>
            </Button>
          ))}
        </div>
      )}
      {channels.phones.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          {headingLevel === null ? null : (
            <Heading className="text-title-sm text-text-primary">
              {t('callSection')}
            </Heading>
          )}
          {channels.phones.map((channel) => (
            <Button
              key={channel.href}
              asChild
              block
              shape="soft"
              variant="white"
            >
              <a
                href={channel.href}
                aria-label={t('callTo', { name: name(channel) })}
              >
                <Icon icon={Call} size={20} />
                {text(channel)}
              </a>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
