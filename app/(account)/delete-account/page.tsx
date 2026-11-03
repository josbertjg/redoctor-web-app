import type { Metadata } from 'next';

import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { getSupportContact } from '@/app/lib/data/support';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { routes } from '@/app/lib/routes';
import { brandOpenGraph } from '@/app/lib/site';

import { MessagesScope } from '@/app/ui/messages-scope';
import { PageTransition } from '@/app/ui/motion/view-transitions';

import {
  DeleteAccountFlow,
  type DeleteAccountWords,
} from '../_components/delete-account-flow';
import { LegalDocument } from '../_components/legal-document';
import { deleteAccountSections } from '../_data/legal-sections';

export async function generateMetadata(): Promise<Metadata> {
  const [t, site] = await Promise.all([
    getTranslations('legal.deleteAccount'),
    getTranslations('metadata'),
  ]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: routes.deleteAccount() },
    openGraph: brandOpenGraph({
      title: t('metaTitle'),
      description: t('metaDescription'),
      siteName: site('siteName'),
      imageAlt: site('ogImageAlt'),
    }),
  };
}

/*
 * Deleting one's account (M10, REDOC-352; self-service since the owner's
 * call of 2026-11-02): the stores ask for a page that works without the
 * app. Signed in, the person deletes it right here, at once (the flow);
 * the document below says how it goes, what happens to each thing, and
 * the way through support for whoever cannot sign in. Public and indexed.
 */
export default async function DeleteAccountPage() {
  const support = await getSupportContact();
  return (
    <PageTransition>
      <LegalDocument
        document="deleteAccount"
        support={support}
        sections={deleteAccountSections}
        contents={false}
        lead={<DeleteAccountLead />}
      />
    </PageTransition>
  );
}

/** The flow with its words, translated here on the server. */
function DeleteAccountLead() {
  const t = useTranslations('legal.deleteAccount.flow');
  const words: DeleteAccountWords = {
    title: t('title'),
    signIn: t('signIn'),
    admin: t('admin'),
    intro: t('intro'),
    deletedTitle: t('deletedTitle'),
    cancelledTitle: t('cancelledTitle'),
    keptTitle: t('keptTitle'),
    patient: {
      personal: t('patient.personal'),
      relatives: t('patient.relatives'),
      writtenReviews: t('patient.writtenReviews'),
      devices: t('patient.devices'),
      appointments: t('patient.appointments'),
      appointmentRecord: t('patient.appointmentRecord'),
    },
    specialist: {
      personal: t('specialist.personal'),
      profile: t('specialist.profile'),
      offices: t('specialist.offices'),
      credentials: t('specialist.credentials'),
      receivedReviews: t('specialist.receivedReviews'),
      devices: t('specialist.devices'),
      appointments: t('specialist.appointments'),
      subscription: t('specialist.subscription'),
      balance: t('specialist.balance'),
      appointmentRecord: t('specialist.appointmentRecord'),
      payments: t('specialist.payments'),
    },
    emailFree: t('emailFree'),
    reauthNote: {
      google: t('reauthNote', { provider: 'Google' }),
      apple: t('reauthNote', { provider: 'Apple' }),
    },
    button: t('button'),
    deleted: t('deleted'),
    wrongAccount: t('wrongAccount'),
    appleRevokeFailed: t('appleRevokeFailed'),
    failed: t('failed'),
    noProvider: t('noProvider'),
  };
  return (
    // The sign-in buttons say a failed sign-in in the API errors' words.
    <MessagesScope namespaces={pageNamespaces.signIn}>
      <DeleteAccountFlow words={words} />
    </MessagesScope>
  );
}
