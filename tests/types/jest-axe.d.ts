/*
 * jest-axe ships no typings and @types/jest-axe drags the Jest globals in,
 * which collide with Vitest. This mirrors the API we use, typed on axe-core.
 */
declare module 'jest-axe' {
  import type {
    AxeResults,
    ImpactValue,
    Result,
    RunOptions,
    Spec,
  } from 'axe-core';

  export type JestAxe = (
    html: Element | string,
    options?: RunOptions,
  ) => Promise<AxeResults>;

  export type JestAxeConfigureOptions = RunOptions & {
    globalOptions?: Spec;
    impactLevels?: ImpactValue[];
  };

  export type AssertionsResult = {
    actual: Result[];
    message(): string;
    pass: boolean;
  };

  export const axe: JestAxe;
  export function configureAxe(options?: JestAxeConfigureOptions): JestAxe;
  export const toHaveNoViolations: {
    toHaveNoViolations(results?: Partial<AxeResults>): AssertionsResult;
  };
}
