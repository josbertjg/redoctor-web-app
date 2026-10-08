/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type -- declaration merging needs interfaces */
import 'vitest';

/* The accessibility matcher registered in tests/setup.ts. */
type AxeMatchers<R = unknown> = {
  toHaveNoViolations(): R;
};

declare module 'vitest' {
  // The default must match Vitest's own declaration for the interfaces to merge.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends AxeMatchers<T> {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
