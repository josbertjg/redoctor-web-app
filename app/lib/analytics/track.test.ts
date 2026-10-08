// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setAnalyticsSink, track } from './track';

afterEach(() => {
  setAnalyticsSink(undefined);
});

describe('track', () => {
  it('keeps the events sent before the service joins, in order', () => {
    track('web_link_opened', {
      origin: 'whatsapp-invitation',
      link: 'invitation',
    });
    track('web_link_opened', { origin: 'email-12', link: 'appointment' });

    const sink = vi.fn();
    setAnalyticsSink(sink);

    expect(sink.mock.calls).toEqual([
      [
        'web_link_opened',
        { origin: 'whatsapp-invitation', link: 'invitation' },
      ],
      ['web_link_opened', { origin: 'email-12', link: 'appointment' }],
    ]);
  });

  it('sends straight to the service once it is there', () => {
    const sink = vi.fn();
    setAnalyticsSink(sink);

    track('web_link_opened', { origin: 'share-profile', link: 'specialist' });

    expect(sink).toHaveBeenCalledOnce();
  });
});
