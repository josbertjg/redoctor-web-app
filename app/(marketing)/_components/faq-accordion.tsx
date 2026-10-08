'use client';

import ExpandCircleDown from '@material-symbols/svg-400/rounded/expand_circle_down.svg?svgr';
import { Accordion } from 'radix-ui';

import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';

export type FaqEntry = { key: string; question: string; answer: string };

type FaqAccordionProps = { items: FaqEntry[]; className?: string };

/*
 * The questions (Figma): one open at a time, the first open on arrival, the
 * chevron turning as each one opens. Radix gives the keyboard and ARIA
 * behaviour; the heights animate with the value it measures. The pieces
 * carry `data-piece` for the section's entrance (faq-motion.tsx): the
 * separator is a drawn line, not a border, so it can draw itself. Over a
 * question it steps right a little and its chevron grows.
 */
export function FaqAccordion({ items, className }: FaqAccordionProps) {
  const [first] = items;

  return (
    <Accordion.Root
      type="single"
      collapsible
      {...(first ? { defaultValue: first.key } : {})}
      className={cn('flex flex-col', className)}
    >
      {items.map((item) => (
        <Accordion.Item
          key={item.key}
          value={item.key}
          data-piece="row"
          className="relative"
        >
          <Accordion.Header className="text-subtitle-s font-medium">
            <Accordion.Trigger className="group flex min-h-touch w-full items-center gap-2.5 rounded-sm py-3 text-left text-pure-white outline-none focus-visible:ring-3 focus-visible:ring-white-50/70">
              <span
                data-piece="chevron"
                className="inline-flex shrink-0 transition-[rotate,scale] duration-base ease-house group-hover:scale-110 group-data-[state=open]:rotate-180"
              >
                <Icon icon={ExpandCircleDown} size={24} />
              </span>
              <span className="transition-[translate] duration-base ease-house group-hover:translate-x-1">
                {item.question}
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <p
              data-piece="answer"
              className="pb-4 pl-9 text-subtitle-s font-medium text-pure-white"
            >
              {item.answer}
            </p>
          </Accordion.Content>
          <span
            data-piece="line"
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px origin-left bg-blue-200"
          />
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
