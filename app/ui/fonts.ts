import { Urbanist } from 'next/font/google';

/* The app's font, self-hosted by next/font and exposed as --font-urbanist. */
export const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-urbanist',
});
