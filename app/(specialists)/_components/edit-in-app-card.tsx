import Mobile from '@material-symbols/svg-400/rounded/mobile.svg?svgr';

import { OpenInAppButton } from '@/app/ui/app-bridge/open-in-app-button';
import { StatusCard } from '@/app/ui/status-card';

/*
 * What only the app changes, said where the specialist reads it (the web
 * shows the profile; the app edits it): «Abrir en la app» with the page's
 * own path, which the app opens on the same screen on a phone where it is
 * installed (AGENTS.md §6). On a computer, the note to open it from the
 * phone.
 */
export function EditInAppCard({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** The page's own path (`routes.*`). */
  path: string;
}) {
  return (
    <StatusCard icon={Mobile} title={title} description={description}>
      <OpenInAppButton path={path} className="sm:items-start" />
    </StatusCard>
  );
}
