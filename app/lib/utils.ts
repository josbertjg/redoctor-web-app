import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
 * Our type scale lives under `text-*` (tokens.css). Without declaring it,
 * tailwind-merge would read `text-headline-lg` as a color and drop it when it
 * sits next to `text-primary`.
 */
const typeScale = [
  'display-xl',
  'display-lg',
  'display-md',
  'display-sm',
  'headline-lg',
  'headline-md',
  'headline-sm',
  'title-lg',
  'title-md',
  'title-sm',
  'body-lg',
  'body-md',
  'body-sm',
  'label-lg',
  'label-md',
  'label-sm',
  'title-xxxl',
  'title-xxl',
  'title-xl',
  'subtitle-l',
  'subtitle-m',
  'subtitle-s',
  'body-xs',
  'body-xxs',
  'body-xxxs',
];

const twMerge = extendTailwindMerge({
  extend: { theme: { text: typeScale } },
});

/** Merges class names, resolving Tailwind conflicts (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
