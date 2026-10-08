// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from './errors';
import { createWriteOnceGuard } from './write-once';

const lostAnswer = () =>
  new ApiError({ kind: 'uncertain', method: 'POST', path: '/confirm' });

describe('createWriteOnceGuard', () => {
  it('returns what the write returns when its answer arrives', async () => {
    const run = createWriteOnceGuard<string>();
    const findLanded = vi.fn();

    await expect(
      run({ intent: 'a', send: () => Promise.resolve('ok'), findLanded }),
    ).resolves.toBe('ok');
    expect(findLanded).not.toHaveBeenCalled();
  });

  it('finds the write that landed although its answer was lost', async () => {
    const run = createWriteOnceGuard<string>();

    await expect(
      run({
        intent: 'a',
        send: () => Promise.reject(lostAnswer()),
        findLanded: () => Promise.resolve('landed'),
      }),
    ).resolves.toBe('landed');
  });

  it('keeps the doubt and looks again before re-sending', async () => {
    const run = createWriteOnceGuard<string>();
    const send = vi.fn(() => Promise.reject(lostAnswer()));
    const findLanded = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('landed later');

    await expect(run({ intent: 'a', send, findLanded })).rejects.toMatchObject({
      kind: 'uncertain',
    });
    await expect(run({ intent: 'a', send, findLanded })).resolves.toBe(
      'landed later',
    );
    expect(send).toHaveBeenCalledOnce();
  });

  it('never re-sends when it cannot even look', async () => {
    const run = createWriteOnceGuard<string>();
    const send = vi.fn(() => Promise.reject(lostAnswer()));
    const findLanded = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('offline'));

    await expect(run({ intent: 'a', send, findLanded })).rejects.toBeTruthy();
    await expect(run({ intent: 'a', send, findLanded })).rejects.toThrow(
      'offline',
    );
    expect(send).toHaveBeenCalledOnce();
  });

  it('keeps doubts apart per intent', async () => {
    const run = createWriteOnceGuard<string>();
    await expect(
      run({
        intent: 'appointment-1',
        send: () => Promise.reject(lostAnswer()),
        findLanded: () => Promise.resolve(null),
      }),
    ).rejects.toBeTruthy();

    const otherFind = vi.fn(() => Promise.resolve(null));
    await expect(
      run({
        intent: 'appointment-2',
        send: () => Promise.resolve('sent'),
        findLanded: otherFind,
      }),
    ).resolves.toBe('sent');
    expect(otherFind).not.toHaveBeenCalled();
  });

  it('lets other failures through untouched', async () => {
    const run = createWriteOnceGuard<string>();
    const conflict = new ApiError({
      kind: 'http',
      method: 'POST',
      path: '/confirm',
      status: 409,
      code: 'ERR_4013',
    });
    const findLanded = vi.fn();

    await expect(
      run({ intent: 'a', send: () => Promise.reject(conflict), findLanded }),
    ).rejects.toBe(conflict);
    expect(findLanded).not.toHaveBeenCalled();
  });
});
