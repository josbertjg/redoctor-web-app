/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- rendered to PNG by next/og (satori), never by a browser */
import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { colorToken } from '@/app/lib/design-tokens';

/*
 * The brand card behind every generated Open Graph image (1200×630): blue
 * background, white wordmark, a headline and a line of support. next/og
 * renders it with satori, which knows nothing of Tailwind or CSS variables,
 * so it styles inline with values read from tokens.css.
 */

export const ogSize = { width: 1200, height: 630 };

const fontsDirectory = join(process.cwd(), 'app/ui/og/fonts');

export const ogFonts = [
  {
    name: 'Urbanist',
    data: readFileSync(join(fontsDirectory, 'urbanist-bold.ttf')),
    weight: 700 as const,
    style: 'normal' as const,
  },
  {
    name: 'Urbanist',
    data: readFileSync(join(fontsDirectory, 'urbanist-semibold.ttf')),
    weight: 600 as const,
    style: 'normal' as const,
  },
];

export const ogColors = {
  background: colorToken('blue-500'),
  text: colorToken('pure-white'),
  support: colorToken('blue-100'),
  accent: colorToken('green-500'),
};
const colors = ogColors;

/* The wordmark with its blue turned white, as a data URI satori can draw. */
export const ogWhiteLogo = (() => {
  const svg = readFileSync(
    join(process.cwd(), 'public/brand/logo.svg'),
    'utf8',
  );
  const white = svg.replace(new RegExp(colors.background, 'gi'), colors.text);
  return `data:image/svg+xml;base64,${Buffer.from(white).toString('base64')}`;
})();

type BrandCardProps = {
  title: string;
  subtitle?: string;
};

export function BrandCard({ title, subtitle }: BrandCardProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: 'Urbanist',
      }}
    >
      <img src={ogWhiteLogo} width={318} height={57} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -0.5,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              lineHeight: 1.35,
              color: colors.support,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      <OgAccentBars />
    </div>
  );
}

/** The two green bars of the logo's «e», closing every card. */
export function OgAccentBars() {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div
        style={{
          width: 96,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.accent,
        }}
      />
      <div
        style={{
          width: 48,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.accent,
        }}
      />
    </div>
  );
}
