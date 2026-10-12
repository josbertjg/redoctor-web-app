import { formatNationalPhone } from './format/phone';
import { publicEnv } from './public-env';

/*
 * Redoctor's support channels (AGENTS.md §12): provisional, read from the
 * environment until the configuration endpoint exists (REDOC-357). Each
 * entry is `Label|+number`, validated by env.ts; lists are comma-separated.
 */

export type SupportChannel = {
  label: string;
  /** As people read it: `0422 736 2867`. */
  number: string;
  href: string;
};

export type SupportChannels = {
  whatsapp: SupportChannel | null;
  phones: SupportChannel[];
};

function parseEntry(entry: string): { label: string; number: string } | null {
  const [label, number] = entry.split('|').map((part) => part.trim());
  if (!label || !number) return null;
  return { label, number };
}

/**
 * A WhatsApp chat with the message already written. The text says nothing
 * about the person: the link passes through wa.me, outside the chat's
 * encryption, and support sees who writes anyway.
 */
export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export function supportChannels(
  whatsappMessage: string,
  source: { whatsapp: string; phones: string } = {
    whatsapp: publicEnv.supportWhatsapp,
    phones: publicEnv.supportPhones,
  },
): SupportChannels {
  const whatsapp = parseEntry(source.whatsapp);
  const phones = source.phones
    .split(',')
    .map(parseEntry)
    .filter((entry) => entry !== null);

  return {
    whatsapp: whatsapp && {
      label: whatsapp.label,
      number: formatNationalPhone(whatsapp.number),
      href: whatsappLink(whatsapp.number, whatsappMessage),
    },
    phones: phones.map((phone) => ({
      label: phone.label,
      number: formatNationalPhone(phone.number),
      href: `tel:${phone.number}`,
    })),
  };
}
