import { loadEnvConfig } from '@next/env';

/*
 * First setup file: loads .env.test the way Next.js would for NODE_ENV=test,
 * before any module that reads the environment at import time (MSW handlers,
 * app/lib/env.ts).
 */
loadEnvConfig(process.cwd());
