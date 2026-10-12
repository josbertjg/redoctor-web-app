import { afterEach, describe, expect, it } from 'vitest';

import {
  forgetSessionHint,
  hasSessionHint,
  rememberSessionHint,
  sessionHintCookie,
} from './session-hint';

describe('session hint cookie', () => {
  afterEach(() => {
    forgetSessionHint();
  });

  it('remembers and forgets without carrying anything else', () => {
    rememberSessionHint();
    expect(document.cookie).toContain(`${sessionHintCookie}=1`);
    expect(hasSessionHint(document.cookie)).toBe(true);

    forgetSessionHint();
    expect(document.cookie).not.toContain(`${sessionHintCookie}=1`);
    expect(hasSessionHint(document.cookie)).toBe(false);
  });

  it('reads a Cookie header', () => {
    expect(hasSessionHint('a=b; redoctor-session=1; c=d')).toBe(true);
    expect(hasSessionHint('a=b; redoctor-session=; c=d')).toBe(false);
    expect(hasSessionHint('redoctor-session-other=1')).toBe(false);
    expect(hasSessionHint(null)).toBe(false);
  });
});
