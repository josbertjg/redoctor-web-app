import type { ReactNode } from 'react';

import { AuthScene } from './_components/auth-scene';

/*
 * Module M2–M3: the sign-in and the sign-up share one scene, kept while the
 * person moves between them (AGENTS.md §8, rule 13: the bar holds still).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthScene>{children}</AuthScene>;
}
