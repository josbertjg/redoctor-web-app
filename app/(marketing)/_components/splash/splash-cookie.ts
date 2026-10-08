/*
 * The splash plays once per browser session (AGENTS.md §13): this session
 * cookie, set when the veil leaves, tells the server not to render it again.
 * It carries nothing but a flag.
 */
export const splashCookie = 'redoctor-splash';
