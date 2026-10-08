import { OpenInAppButton } from '@/app/ui/app-bridge/open-in-app-button';
import { EmptyState } from '@/app/ui/empty-state';
import type { IconComponent } from '@/app/ui/icons';

type BridgeContentProps = {
  icon: IconComponent;
  title: string;
  description: string;
  /** The page's own path: the app opens the same one. */
  path: string;
  /** Where the link came from: the API's emails, or a link someone shared. */
  source: 'email' | 'link';
};

/*
 * What a bridge shows when the app did not open by itself (not installed,
 * read on a computer, or opened inside the mail app's own browser): what
 * opens there and the button that opens it. Port of the prototype's
 * fallback pages; no API, no session, no personal data.
 */
export function BridgeContent({
  icon,
  title,
  description,
  path,
  source,
}: BridgeContentProps) {
  return (
    <main className="flex flex-1 flex-col justify-center pb-16">
      <EmptyState
        headingLevel={1}
        icon={icon}
        title={title}
        description={description}
        action={<OpenInAppButton path={path} source={source} />}
      />
    </main>
  );
}
