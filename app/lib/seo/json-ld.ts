/*
 * Structured data for search engines: schema.org's vocabulary written as
 * JSON-LD inside a `<script type="application/ld+json">` (AGENTS.md §4).
 * The browser never runs that script — it is a data block —, but it still
 * closes at the first `</script>`, and the values come from people (a
 * specialist's name, a description): the serializer writes `<`, `>` and `&`
 * as escapes, so nothing a person typed can close the tag or open another.
 */

export type JsonLdValue =
  | string
  | number
  | boolean
  | JsonLdValue[]
  | { [property: string]: JsonLdValue | undefined };

export type JsonLd = {
  '@context': 'https://schema.org';
  '@type': string;
  [property: string]: JsonLdValue | undefined;
};

// U+2028 and U+2029, the line and paragraph separators, named by their
// codes: written out, they would break the lines of this file.
const lineSeparator = String.fromCharCode(0x2028);
const paragraphSeparator = String.fromCharCode(0x2029);

/** What leaves a string as a JSON escape: the characters HTML reads, and the separators. */
const escapes: ReadonlyMap<string, string> = new Map([
  ['<', '\\u003c'],
  ['>', '\\u003e'],
  ['&', '\\u0026'],
  [lineSeparator, '\\u2028'],
  [paragraphSeparator, '\\u2029'],
]);

const escapable = new RegExp(`[<>&${lineSeparator}${paragraphSeparator}]`, 'g');

/** The document as the HTML carries it: valid JSON that cannot break out of its tag. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(
    escapable,
    (character) => escapes.get(character) ?? character,
  );
}
