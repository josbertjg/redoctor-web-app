import { useTranslations } from 'next-intl';

import { LandingBar } from './landing-bar';
import { SearchBar } from './search-bar';
import { landingSections } from '../_data/landing-content';

/*
 * The landing's bar: the copy is translated here and handed to the client
 * bar (landing-bar.tsx), which docks it once the hero's search bar scrolls
 * out of sight, together with the bar's own search, rendered here.
 */
export function LandingHeader({ waitForSplash }: { waitForSplash: boolean }) {
  const t = useTranslations('landing.nav');
  const search = useTranslations('landing.hero.search');
  const common = useTranslations('common');
  const links = [
    { href: `#${landingSections.howItWorks}`, label: t('specialists') },
    { href: `#${landingSections.pricing}`, label: t('plans') },
    { href: `#${landingSections.faq}`, label: t('faq') },
  ];

  return (
    <LandingBar
      waitForSplash={waitForSplash}
      links={links}
      labels={{
        nav: t('label'),
        home: common('homeLabel'),
        signIn: t('signIn'),
        openMenu: t('openMenu'),
        closeMenu: t('closeMenu'),
      }}
      search={
        <SearchBar
          variant="bar"
          label={search('barLabel')}
          className="max-w-2xl opacity-0 transition-opacity duration-slow ease-house group-data-docked/bar:opacity-100"
        />
      }
    />
  );
}
