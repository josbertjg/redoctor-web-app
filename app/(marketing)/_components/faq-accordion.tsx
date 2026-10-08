'use client';

import ExpandCircleDown from '@material-symbols/svg-400/rounded/expand_circle_down.svg?svgr';
import { Accordion } from 'radix-ui';

import { Icon } from '@/app/ui/icons';

export type FaqEntry = { key: string; question: string; answer: string };

/*
 * The questions (Figma): one open at a time, the first open on arrival, the
 * chevron turning as each one opens. Radix gives the keyboard and ARIA
 * behaviour; the heights animate with the value it measures.
 */
export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  const [first] = items;

  return (
    <Accordion.Root
      type="single"
      collapsible
      {...(first ? { defaultValue: first.key } : {})}
      className="flex flex-col"
    >
      {items.map((item) => (
        <Accordion.Item
          key={item.key}
          value={item.key}
          className="border-b border-blue-200"
        >
          <Accordion.Header className="text-subtitle-s font-medium">
            <Accordion.Trigger className="group flex min-h-touch w-full items-center gap-2.5 rounded-sm py-3 text-left text-pure-white outline-none focus-visible:ring-3 focus-visible:ring-white-50/70">
              <Icon
                icon={ExpandCircleDown}
                size={24}
                className="shrink-0 transition-transform duration-base ease-house group-data-[state=open]:rotate-180"
              />
              {item.question}
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <p className="pb-4 pl-9 text-subtitle-s font-medium text-pure-white">
              {item.answer}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
