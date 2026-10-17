import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import type { ClaimRelationship } from '@/app/lib/schemas/invitations';
import { brandOpenGraph } from '@/app/lib/site';

import { LinkOriginTracker } from '@/app/ui/analytics/link-origin-tracker';
import { MessagesScope } from '@/app/ui/messages-scope';
import { PageTransition } from '@/app/ui/motion/view-transitions';

import { InvitationFlow } from '../../_components/invitation-flow';

/*
 * `/i/{token}` (M4): the link a specialist sends by WhatsApp to a patient
 * with no account. The token is the credential (AGENTS.md §6): never
 * indexed, never in a referrer, and the preview says nothing about the
 * appointment — no names, no dates. The invitation is read in the browser,
 * from the patient's own device (§5).
 */

export async function generateMetadata(): Promise<Metadata> {
  const [t, site] = await Promise.all([
    getTranslations('appointments.invitation'),
    getTranslations('metadata'),
  ]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
    openGraph: brandOpenGraph({
      title: t('metaTitle'),
      description: t('metaDescription'),
      siteName: site('siteName'),
      imageAlt: site('ogImageAlt'),
    }),
  };
}

const claimFor: Readonly<Record<string, ClaimRelationship>> = {
  self: 'SELF',
  dependent: 'DEPENDENT',
};

export default async function InvitationPage({
  params,
  searchParams,
}: PageProps<'/i/[token]'>) {
  const [{ token }, { for: answer }] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <>
      <LinkOriginTracker link="invitation" />
      <PageTransition>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-gutter pt-6 pb-16">
          <MessagesScope namespaces={pageNamespaces.invitation}>
            <InvitationFlow
              token={token}
              initialRelationship={
                typeof answer === 'string' ? (claimFor[answer] ?? null) : null
              }
            />
          </MessagesScope>
        </main>
      </PageTransition>
    </>
  );
}
