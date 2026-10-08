/*
 * Nothing that identifies a person or opens their data leaves for error
 * reports or analytics (AGENTS.md §6, §11). Query strings (?token= of the
 * opt-out, ?origin=, ?redirect=) and fragments are cut, and the path segments
 * that are credentials are masked: the web's /i/{token} and the API's
 * /scheduling/invitations/{token}. Pure functions with structural types, so
 * Sentry and PostHog plug them in without app/lib depending on either.
 */

const credentialSegments: readonly [RegExp, string][] = [
  [/(^|\s|\/\/[^/\s]+)\/i\/[^/\s?#]+/g, '$1/i/[token]'],
  [/\/scheduling\/invitations\/[^/\s?#]+/g, '/scheduling/invitations/[token]'],
];

const queryOrFragment = /[?#][^\s]*/g;

/** Free text (a message, a transaction name) with every URL in it scrubbed. */
export function scrubText(text: string): string {
  let result = text.replace(queryOrFragment, '');
  for (const [pattern, replacement] of credentialSegments) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** One URL, absolute or a path, without query, fragment or credentials. */
export function scrubUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://relative.invalid');
  } catch {
    return '[url]';
  }
  const path = scrubText(parsed.pathname);
  const isAbsolute = /^[a-z][a-z\d+.-]*:\/\//i.test(url);
  return isAbsolute ? `${parsed.origin}${path}` : path;
}

/* ---------- Sentry ------------------------------------------------------ */

type BreadcrumbLike = {
  category?: string | undefined;
  message?: string | undefined;
  data?: Record<string, unknown> | undefined;
};

type EventLike = {
  message?: string | undefined;
  transaction?: string | undefined;
  request?:
    | {
        url?: string | undefined;
        query_string?: unknown;
        cookies?: unknown;
        data?: unknown;
        headers?: Record<string, string> | undefined;
      }
    | undefined;
  exception?: { values?: { value?: string | undefined }[] | undefined };
  breadcrumbs?: BreadcrumbLike[] | undefined;
};

const urlDataKeys = ['url', 'from', 'to'];

/** Console breadcrumbs are free text: never sent. URLs lose what they carry. */
export function scrubBreadcrumb<B extends BreadcrumbLike>(crumb: B): B | null {
  if (crumb.category === 'console') return null;
  if (crumb.message !== undefined) crumb.message = scrubText(crumb.message);
  if (crumb.data) {
    for (const key of urlDataKeys) {
      const value = crumb.data[key];
      if (typeof value === 'string') crumb.data[key] = scrubUrl(value);
    }
  }
  return crumb;
}

/** An error report with no URL secrets, no body, no cookies, no headers. */
export function scrubEvent<E extends EventLike>(event: E): E {
  const { request } = event;
  if (request) {
    if (request.url !== undefined) request.url = scrubUrl(request.url);
    delete request.query_string;
    delete request.cookies;
    delete request.data;
    // Referer and friends carry full URLs; the user agent is enough.
    const userAgent = request.headers?.['user-agent'];
    request.headers =
      userAgent === undefined ? {} : { 'user-agent': userAgent };
  }
  if (event.transaction !== undefined) {
    event.transaction = scrubText(event.transaction);
  }
  if (event.message !== undefined) event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value !== undefined) {
      exception.value = scrubText(exception.value);
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.flatMap((crumb) => {
      const kept = scrubBreadcrumb(crumb);
      return kept === null ? [] : [kept];
    });
  }
  return event;
}

/* ---------- PostHog ----------------------------------------------------- */

const analyticsUrlKeys = [
  '$current_url',
  '$pathname',
  '$referrer',
  '$initial_current_url',
  '$initial_referrer',
  '$initial_pathname',
  '$prev_pageview_pathname',
];

function scrubUrlProperties(properties: Record<string, unknown> | undefined) {
  if (!properties) return;
  for (const key of analyticsUrlKeys) {
    const value = properties[key];
    if (typeof value === 'string') properties[key] = scrubUrl(value);
  }
}

type AnalyticsEventLike = {
  properties?: Record<string, unknown> | undefined;
  $set?: Record<string, unknown> | undefined;
  $set_once?: Record<string, unknown> | undefined;
};

/** The URLs PostHog attaches to every event, without what they carry. */
export function scrubAnalyticsEvent<E extends AnalyticsEventLike>(
  event: E | null,
): E | null {
  if (event === null) return null;
  scrubUrlProperties(event.properties);
  scrubUrlProperties(event.$set);
  scrubUrlProperties(event.$set_once);
  return event;
}
