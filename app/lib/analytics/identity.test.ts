// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { forgetPerson, identifyPerson, setIdentitySink } from './identity';

afterEach(() => {
  forgetPerson();
  setIdentitySink(undefined);
});

describe('identity', () => {
  it('hands the person to the service once it joins', () => {
    identifyPerson({ id: 'u1', role: 'patient' });
    const sink = { identify: vi.fn(), reset: vi.fn() };

    setIdentitySink(sink);

    expect(sink.identify).toHaveBeenCalledWith({ id: 'u1', role: 'patient' });
  });

  it('identifies at once when the service is there, and forgets on sign-out', () => {
    const sink = { identify: vi.fn(), reset: vi.fn() };
    setIdentitySink(sink);

    identifyPerson({ id: 'u2', role: 'specialist' });
    forgetPerson();

    expect(sink.identify).toHaveBeenCalledWith({
      id: 'u2',
      role: 'specialist',
    });
    expect(sink.reset).toHaveBeenCalledOnce();
  });

  it('does not replay a person forgotten before the service joined', () => {
    identifyPerson({ id: 'u3', role: 'patient' });
    forgetPerson();
    const sink = { identify: vi.fn(), reset: vi.fn() };

    setIdentitySink(sink);

    expect(sink.identify).not.toHaveBeenCalled();
  });
});
