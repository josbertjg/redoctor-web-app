/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- rendered to PNG by next/og (satori), never by a browser */
import 'server-only';

import { ogColors, ogWhiteLogo, OgAccentBars } from '@/app/ui/og/brand-card';

type SpecialistOgCardProps = {
  name: string;
  /** The verified specialties, already joined for one line. */
  specialties: string;
  /** «Especialista verificado», only when the profile is verified. */
  verifiedLabel?: string | undefined;
  /** The photo as a data URI, or null to draw the initials. */
  photo: string | null;
  initials: string;
};

const PORTRAIT = 220;

/*
 * The preview of a shared profile (`/s/{id}`): the brand card with the
 * specialist's photo, name and verified specialties. All of it is public
 * information (AGENTS.md §6); nothing else is ever drawn here.
 */
export function SpecialistOgCard({
  name,
  specialties,
  verifiedLabel,
  photo,
  initials,
}: SpecialistOgCardProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        backgroundColor: ogColors.background,
        color: ogColors.text,
        fontFamily: 'Urbanist',
      }}
    >
      <img src={ogWhiteLogo} width={318} height={57} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
        {photo === null ? (
          <div
            style={{
              width: PORTRAIT,
              height: PORTRAIT,
              borderRadius: PORTRAIT / 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ogColors.support,
              color: ogColors.background,
              fontSize: 88,
              fontWeight: 700,
            }}
          >
            {initials}
          </div>
        ) : (
          <img
            src={photo}
            width={PORTRAIT}
            height={PORTRAIT}
            style={{
              borderRadius: PORTRAIT / 2,
              border: `6px solid ${ogColors.text}`,
              objectFit: 'cover',
            }}
          />
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
          }}
        >
          {verifiedLabel ? (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                padding: '8px 20px',
                borderRadius: 999,
                backgroundColor: ogColors.text,
                color: ogColors.background,
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {verifiedLabel}
            </div>
          ) : null}
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
            {name}
          </div>
          {specialties ? (
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                lineHeight: 1.3,
                color: ogColors.support,
              }}
            >
              {specialties}
            </div>
          ) : null}
        </div>
      </div>
      <OgAccentBars />
    </div>
  );
}
