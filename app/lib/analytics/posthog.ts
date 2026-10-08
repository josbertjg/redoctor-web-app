// The slim build without external scripts: capture only, half the size
// (≈50 KB gzip instead of ≈100). Surveys, recordings and the rest stay off.
import posthog from 'posthog-js/dist/module.slim.no-external';

import { setAnalyticsSink } from './track';
import { scrubAnalyticsEvent } from '../observability/scrub';

/*
 * PostHog in the browser, only when NEXT_PUBLIC_POSTHOG_KEY is set
 * (instrumentation-client.ts). Only the events the web sends on purpose
 * (`web_<area>_<action>`, AGENTS.md §9): no autocapture, no pageviews (URLs
 * can carry tokens), no recordings, no surveys, no extra scripts, profiles
 * only for identified people. Identify by user id only, from M2; sign-out
 * calls `posthog.reset()`.
 */
export function initPosthog({ key, host }: { key: string; host: string }) {
  posthog.init(key, {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_exceptions: false,
    capture_performance: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_web_experiments: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage',
    save_referrer: false,
    before_send: (event) => scrubAnalyticsEvent(event),
  });

  setAnalyticsSink((event, properties) => {
    posthog.capture(event, properties);
  });
}
