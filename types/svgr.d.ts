/*
 * An SVG imported with the `?svgr` query is a React component: the Turbopack
 * rule in next.config.ts and the Vite plugin in vitest.config.mts compile it.
 * Used for the Material Symbols icons behind app/ui/icon.tsx.
 */
declare module '*.svg?svgr' {
  import type { ComponentType, SVGProps } from 'react';

  const Component: ComponentType<SVGProps<SVGSVGElement>>;
  export default Component;
}
