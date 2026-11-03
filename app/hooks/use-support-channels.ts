'use client';

import { useQuery } from '@tanstack/react-query';

import { supportContactQueryOptions } from '@/app/lib/queries/support';
import {
  noSupport,
  supportChannels,
  type SupportChannels,
} from '@/app/lib/support';

/**
 * Redoctor's support lines, read in the browser (REDOC-357), with the
 * WhatsApp message already written. Empty until the API answers, and empty
 * when nobody filled them: then no way to support is offered.
 */
export function useSupportChannels(whatsappMessage: string): SupportChannels {
  const contact = useQuery(supportContactQueryOptions());
  return supportChannels(contact.data ?? noSupport, whatsappMessage);
}
