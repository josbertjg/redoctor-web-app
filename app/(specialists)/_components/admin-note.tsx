'use client';

import AdminPanelSettings from '@material-symbols/svg-400/rounded/admin_panel_settings.svg?svgr';
import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';

import { useSession } from '@/app/hooks/use-session';

/**
 * An admin who signs in is told their account is used in the app
 * (AGENTS.md §1). Only for an admin's account without a specialist facet.
 */
export function AdminNote({ className }: { className?: string }) {
  const t = useTranslations('specialistHome');
  const { account } = useSession();
  if (account?.role !== 'admin' || account.specialist.exists) return null;

  return (
    <p
      className={cn(
        'flex animate-fade-in items-center gap-3 rounded-xl bg-info-light px-4 py-3 text-body-md text-blue-800',
        className,
      )}
    >
      <Icon icon={AdminPanelSettings} size={24} className="shrink-0" />
      {t('adminNote')}
    </p>
  );
}
