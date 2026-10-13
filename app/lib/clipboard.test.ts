import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copyText } from './clipboard';

/*
 * jsdom has neither the Clipboard API nor `execCommand`: each test lends
 * the browser the answers it needs, and takes them back.
 */
function browser(writeText: () => Promise<void>, execCommand: () => boolean) {
  const selectionCopy = vi.fn(execCommand);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: selectionCopy,
  });
  return selectionCopy;
}

beforeEach(() => {
  browser(
    () => Promise.resolve(),
    () => true,
  );
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(document, 'execCommand');
});

describe('copyText', () => {
  it('copies through the Clipboard API', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    browser(writeText, () => false);

    await expect(copyText('https://redoctorapp.com/s/1')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://redoctorapp.com/s/1');
  });

  it('falls back to selecting a hidden text when the browser refuses it', async () => {
    const selectionCopy = browser(
      () => Promise.reject(new Error('Refused')),
      () => true,
    );

    await expect(copyText('1198,39')).resolves.toBe(true);
    expect(selectionCopy).toHaveBeenCalledWith('copy');
    // The hidden text leaves with the copy.
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('says so when both ways are refused', async () => {
    browser(
      () => Promise.reject(new Error('Refused')),
      () => false,
    );

    await expect(copyText('1198,39')).resolves.toBe(false);
  });
});
