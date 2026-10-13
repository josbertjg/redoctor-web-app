// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { globalErrorMessages } from './global-error-messages';
import messages from './messages/es.json';

describe('globalErrorMessages', () => {
  it('says what the catalog says', () => {
    expect(globalErrorMessages).toEqual({
      siteName: messages.metadata.siteName,
      title: messages.errors.page.title,
      description: messages.errors.page.description,
      retry: messages.retry,
    });
  });
});
