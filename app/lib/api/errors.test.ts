// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  ApiError,
  forbiddenMessageKeysByCode,
  messageKeysByCode,
  type ApiErrorMessageKey,
} from './errors';
import messages from '../i18n/messages/es.json';

const base = { method: 'GET', path: '/x' } as const;

function messageAt(key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node !== null && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      messages,
    );
}

describe('ApiError.messageKey', () => {
  it('names connectivity problems by kind', () => {
    expect(new ApiError({ ...base, kind: 'network' }).messageKey).toBe(
      'apiErrors.network',
    );
    expect(new ApiError({ ...base, kind: 'timeout' }).messageKey).toBe(
      'apiErrors.timeout',
    );
    expect(new ApiError({ ...base, kind: 'uncertain' }).messageKey).toBe(
      'apiErrors.uncertainOutcome',
    );
  });

  it('translates known codes and falls back for the rest', () => {
    const known = new ApiError({
      ...base,
      kind: 'http',
      status: 409,
      code: 'ERR_5084',
    });
    expect(known.messageKey).toBe('apiErrors.billingErrors.paymentInReview');

    const unknown = new ApiError({
      ...base,
      kind: 'http',
      status: 500,
      code: 'ERR_9001',
    });
    expect(unknown.messageKey).toBe('apiErrors.unexpected');
  });

  it('reads the 403-only codes only with a 403', () => {
    const forbidden = new ApiError({
      ...base,
      kind: 'http',
      status: 403,
      code: 'ERR_2010',
    });
    expect(forbidden.messageKey).toBe(
      'apiErrors.genericCustomErrors.registrationIncomplete',
    );

    const otherStatus = new ApiError({
      ...base,
      kind: 'http',
      status: 400,
      code: 'ERR_2010',
    });
    expect(otherStatus.messageKey).toBe('apiErrors.unexpected');
  });
});

describe('ApiError.isConnectivityProblem', () => {
  it('covers transport failures, not a lost answer nor a business error', () => {
    expect(
      new ApiError({ ...base, kind: 'network' }).isConnectivityProblem,
    ).toBe(true);
    expect(
      new ApiError({ ...base, kind: 'timeout' }).isConnectivityProblem,
    ).toBe(true);
    expect(
      new ApiError({ ...base, kind: 'uncertain' }).isConnectivityProblem,
    ).toBe(false);
    expect(
      new ApiError({ ...base, kind: 'http', status: 503 })
        .isConnectivityProblem,
    ).toBe(false);
  });
});

describe('ApiError.isReportable', () => {
  it('reports unknown codes and broken contracts only', () => {
    expect(
      new ApiError({ ...base, kind: 'http', status: 500, code: 'ERR_9001' })
        .isReportable,
    ).toBe(true);
    expect(
      new ApiError({ ...base, kind: 'invalid-response', status: 200 })
        .isReportable,
    ).toBe(true);
    expect(
      new ApiError({ ...base, kind: 'http', status: 409, code: 'ERR_5084' })
        .isReportable,
    ).toBe(false);
    expect(
      new ApiError({ ...base, kind: 'http', status: 404, code: 'ERR_3030' })
        .isReportable,
    ).toBe(false);
    expect(new ApiError({ ...base, kind: 'network' }).isReportable).toBe(false);
  });

  it('keeps the route template in the message, never a filled path', () => {
    const error = new ApiError({
      method: 'GET',
      path: '/scheduling/invitations/:token',
      kind: 'http',
      status: 404,
    });
    expect(error.message).toContain('/scheduling/invitations/:token');
  });
});

describe('copy', () => {
  it('exists in es.json for every key the client can produce', () => {
    const keys: ApiErrorMessageKey[] = [
      'apiErrors.network',
      'apiErrors.timeout',
      'apiErrors.uncertainOutcome',
      'apiErrors.unexpected',
      ...Object.values(messageKeysByCode),
      ...Object.values(forbiddenMessageKeysByCode),
    ];
    for (const key of keys) {
      expect(typeof messageAt(key), key).toBe('string');
    }
  });
});
