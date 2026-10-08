'use client';

import type { ReactNode } from 'react';

import { Tabs } from 'radix-ui';

type TrainingTabsProps = {
  /** Accessible name of the tab list (i18n: `specialists.trainingLabel`). */
  label: string;
  /** Already translated (i18n: `education`, `certifications`). */
  labels: { education: string; certifications: string };
  education: ReactNode;
  certifications: ReactNode;
};

const tabClass =
  'min-h-touch flex-1 border-b-2 border-transparent px-4 text-body-xs text-text-secondary outline-none transition-colors duration-fast ease-house focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary';

/*
 * «Educación | Certificaciones», as the app's tabs: the verified specialties
 * with their college, and the certifications. Radix gives the keyboard and
 * ARIA behaviour of a tab list.
 */
export function TrainingTabs({
  label,
  labels,
  education,
  certifications,
}: TrainingTabsProps) {
  return (
    <Tabs.Root defaultValue="education" className="flex flex-col gap-4">
      <Tabs.List aria-label={label} className="flex border-b border-divider">
        <Tabs.Trigger value="education" className={tabClass}>
          {labels.education}
        </Tabs.Trigger>
        <Tabs.Trigger value="certifications" className={tabClass}>
          {labels.certifications}
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content
        value="education"
        className="animate-fade-in outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {education}
      </Tabs.Content>
      <Tabs.Content
        value="certifications"
        className="animate-fade-in outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {certifications}
      </Tabs.Content>
    </Tabs.Root>
  );
}
