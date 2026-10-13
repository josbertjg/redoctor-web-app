import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { track } from '@/app/lib/analytics/track';

import { useLinkOrigin } from './use-link-origin';

vi.mock('@/app/lib/analytics/track', () => ({ track: vi.fn() }));

function visit(path: string) {
  window.history.replaceState(null, '', path);
}

afterEach(() => {
  visit('/');
});

describe('useLinkOrigin', () => {
  it('tags the link with its origin, then takes the tag off the URL', async () => {
    visit('/s/abc?origin=whatsapp-invitation&utm=1#reviews');

    renderHook(() => {
      useLinkOrigin('specialist');
    });

    await waitFor(() => {
      expect(window.location.pathname + window.location.search).toBe(
        '/s/abc?utm=1',
      );
    });
    expect(track).toHaveBeenCalledWith('web_link_opened', {
      origin: 'whatsapp-invitation',
      link: 'specialist',
    });
    expect(window.location.hash).toBe('#reviews');
  });

  it('drops an unknown origin without sending it anywhere', async () => {
    visit('/s/abc?origin=someone%40example.com');

    renderHook(() => {
      useLinkOrigin('specialist');
    });

    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
    expect(track).not.toHaveBeenCalled();
  });

  it('does nothing for a link without an origin', () => {
    visit('/s/abc');

    renderHook(() => {
      useLinkOrigin('specialist');
    });

    expect(track).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/s/abc');
  });
});
