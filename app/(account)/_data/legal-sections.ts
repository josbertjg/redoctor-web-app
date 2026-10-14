/*
 * The order of each legal document's sections (M10). The words live in
 * es.json under `legal.<document>.sections.<id>`, so the lawyer's changes
 * touch the catalog alone; these lists decide the order, the anchors and
 * the table of contents.
 */

export const termsSections = [
  'what',
  'definitions',
  'eligibility',
  'account',
  'patients',
  'specialists',
  'plans',
  'reviews',
  'conduct',
  'ip',
  'communications',
  'availability',
  'liability',
  'indemnity',
  'termination',
  'privacy',
  'changes',
  'law',
  'general',
  'contact',
] as const;

export const privacySections = [
  'scope',
  'data',
  'purposes',
  'sharing',
  'transfers',
  'retention',
  'rights',
  'minors',
  'health',
  'security',
  'cookies',
  'communications',
  'changes',
  'contact',
] as const;

export const deleteAccountSections = ['how', 'what'] as const;
