import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    // Same `?svgr` icon imports as the Turbopack rule in next.config.ts.
    svgr({
      include: '**/*.svg?svgr',
      svgrOptions: { icon: true, svgProps: { fill: 'currentColor' } },
    }),
  ],
  resolve: {
    // Honors the `@/*` alias of tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // The real module throws outside React Server Components; in unit tests
      // server modules run in Node, so the guard is a no-op.
      'server-only': fileURLToPath(
        new URL('./tests/stubs/server-only.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/env.ts', './tests/setup.ts'],
    include: ['app/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    restoreMocks: true,
    // `restoreMocks` restores spies only: a hoisted `vi.fn()` (the router)
    // would keep the calls of earlier tests.
    clearMocks: true,
    unstubEnvs: true,
    css: false,
  },
});
