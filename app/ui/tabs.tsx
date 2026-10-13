'use client';

import type { ReactNode } from 'react';

import { Tabs as RadixTabs } from 'radix-ui';

import { cn } from '@/app/lib/utils';

export type TabItem<Value extends string> = {
  value: Value;
  /** Already translated. */
  label: ReactNode;
  content: ReactNode;
};

type TabsProps<Value extends string> = {
  /** Accessible name of the tab list. */
  label: string;
  items: readonly TabItem<Value>[];
  /** The tab open at first; the first item without it. */
  defaultValue?: Value;
  value?: Value;
  onValueChange?: (value: Value) => void;
  className?: string;
};

const tabClass =
  'min-h-touch flex-1 border-b-2 border-transparent px-4 text-body-xs text-text-secondary outline-none transition-colors duration-fast ease-house focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary';

/*
 * The app's tabs: an underlined row («Educación | Certificaciones» on a
 * profile, «Próximas | Pasadas» on the patient's appointments). Radix gives
 * the keyboard and ARIA behaviour of a tab list. Promoted from the profile's
 * TrainingTabs the day the appointments needed one (M6).
 */
export function Tabs<Value extends string>({
  label,
  items,
  defaultValue,
  value,
  onValueChange,
  className,
}: TabsProps<Value>) {
  const initial = defaultValue ?? items[0]?.value;

  return (
    <RadixTabs.Root
      {...(initial === undefined ? {} : { defaultValue: initial })}
      {...(value === undefined ? {} : { value })}
      {...(onValueChange
        ? {
            onValueChange: (next: string) => {
              onValueChange(next as Value);
            },
          }
        : {})}
      className={cn('flex flex-col gap-4', className)}
    >
      <RadixTabs.List
        aria-label={label}
        className="flex border-b border-divider"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={tabClass}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          key={item.value}
          value={item.value}
          className="animate-fade-in outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
