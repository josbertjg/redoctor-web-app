/*
 * Redoctor's support channels (REDOC-357): the call and WhatsApp lines an
 * admin keeps in the business configuration, which the API publishes
 * without a session (`GET /config/support`, read on the server by
 * app/lib/data/support.ts and in the browser by app/lib/queries/support.ts).
 * Each line is shown as it comes, its label and its number; the first
 * WhatsApp is the main one. No line at all is a valid state: every way to
 * support then stays out of sight. No zod here: the contract is parsed
 * where it is read.
 */

/** One line as the API publishes it: a free label and an international number. */
export type SupportLine = { label: string; phone: string };

/** The lines, in the admin's order. */
export type SupportContact = {
  whatsapp: SupportLine[];
  calls: SupportLine[];
};

export const noSupport: SupportContact = { whatsapp: [], calls: [] };

export type SupportChannel = {
  label: string;
  /** As the admin wrote it: `+58 414-0000000`. */
  number: string;
  href: string;
};

export type SupportChannels = {
  whatsapp: SupportChannel[];
  phones: SupportChannel[];
};

/**
 * A WhatsApp chat with the message already written. The text says nothing
 * about the person: the link passes through wa.me, outside the chat's
 * encryption, and support sees who writes anyway.
 */
export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

/** The digits a dialler needs, with the international `+`. */
const dialable = (phone: string) => `+${phone.replace(/\D/g, '')}`;

export function supportChannels(
  contact: SupportContact,
  whatsappMessage: string,
): SupportChannels {
  return {
    whatsapp: contact.whatsapp.map((line) => ({
      label: line.label,
      number: line.phone,
      href: whatsappLink(line.phone, whatsappMessage),
    })),
    phones: contact.calls.map((line) => ({
      label: line.label,
      number: line.phone,
      href: `tel:${dialable(line.phone)}`,
    })),
  };
}

/** Some way to reach support: otherwise it is not offered at all. */
export function hasSupport(channels: SupportChannels): boolean {
  return channels.whatsapp.length > 0 || channels.phones.length > 0;
}
