import { useEffect } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSplashDone } from './splash-state';
import { SplashVeil } from './splash-veil';

// The runtime is the browser's business: here the logo ends at once.
vi.mock('./rive-logo', () => {
  function RiveLogoStub({ onDone }: { onDone: () => void }) {
    useEffect(() => {
      onDone();
    }, [onDone]);
    return null;
  }
  return { default: RiveLogoStub };
});

function Page() {
  const done = useSplashDone();
  return <output>{done ? 'released' : 'waiting'}</output>;
}

describe('SplashVeil', () => {
  it('leaves when the logo ends, remembers the visit and releases the page', async () => {
    render(
      <>
        <SplashVeil />
        <Page />
      </>,
    );

    expect(document.querySelector('[data-splash]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('waiting');

    await waitFor(() => {
      expect(document.querySelector('[data-splash="leaving"]')).not.toBeNull();
    });
    expect(document.cookie).toContain('redoctor-splash=1');
    expect(screen.getByRole('status')).toHaveTextContent('released');
  });
});
