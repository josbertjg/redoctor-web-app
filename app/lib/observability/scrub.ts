/*
 * Nothing that identifies a person or opens their data leaves for error
 * reports or analytics (AGENTS.md §6, §11). Query strings (?token= of the
 * opt-out, ?origin=, ?redirect=) and fragments are cut, and the path segments
 * that are credentials are masked: the web's /i/{token} and the API's
 * /scheduling/invitations/{token}. Pure functions with structural types, so
 * Sentry and PostHog plug them in without app/lib depending on either.
 */

/*
 * A token ends where a URL or a quoted path does: at a slash, a space, the
 * query, or the quote or bracket around it in a message.
 */
const credentialSegments: readonly [RegExp, string][] = [
  // An absolute URL: https://redoctorapp.com/i/{token}.
  [/(\/\/[^/\s"'`()<>]+)\/i\/[^/\s?#"'`()<>]+/g, '$1/i/[token]'],
  // A path on its own, also inside quotes or brackets: "/i/{token}".
  [/(?<![\w%.~/-])\/i\/[^/\s?#"'`()<>]+/g, '/i/[token]'],
  [
    /\/scheduling\/invitations\/[^/\s?#"'`()<>]+/g,
    '/scheduling/invitations/[token]',
  ],
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
  /** Where the SDKs put the request path (`contexts.nextjs.request_path`, query included). */
  contexts?: Record<string, unknown> | undefined;
  extra?: Record<string, unknown> | undefined;
};

/** Every string inside a context, scrubbed in place; deep enough for the SDKs' shapes. */
function scrubStrings(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item: unknown) => scrubStrings(item, depth + 1));
  }
  const record = value as Record<string, unknown>;
  for (const [key, inner] of Object.entries(record)) {
    record[key] = scrubStrings(inner, depth + 1);
  }
  return record;
}

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
    // Referer and friends carry full URLs; the user agent is enough. The
    // browser SDK writes it `User-Agent`, the server one `user-agent`.
    const userAgent = Object.entries(request.headers ?? {}).find(
      ([name]) => name.toLowerCase() === 'user-agent',
    )?.[1];
    request.headers =
      userAgent === undefined ? {} : { 'user-agent': userAgent };
  }
  if (event.contexts) scrubStrings(event.contexts);
  if (event.extra) scrubStrings(event.extra);
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

/*
 * PostHog names every URL it attaches by what it is — `$current_url`,
 * `$pathname`, `$referrer`, their `$initial_` and `$session_entry_` copies,
 * `$prev_pageview_pathname` — so the name, not a list that falls behind the
 * library, says which to clean. `$direct` and plain domains carry no path.
 */
const urlProperty = /(?:url|pathname|referrer)$/i;

function scrubUrlProperties(properties: Record<string, unknown> | undefined) {
  if (!properties) return;
  for (const [key, value] of Object.entries(properties)) {
    if (
      typeof value === 'string' &&
      urlProperty.test(key) &&
      value.includes('/')
    ) {
      properties[key] = scrubUrl(value);
    }
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
