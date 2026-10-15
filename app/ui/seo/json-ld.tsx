import {
  serializeJsonLd,
  type JsonLd as JsonLdDocument,
} from '@/app/lib/seo/json-ld';

/*
 * Structured data for search engines (schema.org as JSON-LD, AGENTS.md §4),
 * rendered on the server with the page. A data block: the browser never
 * runs it, so the Content Security Policy's script rule does not apply and
 * it needs no nonce; the serializer keeps a person's text from closing it.
 */
export function JsonLd({ data }: { data: JsonLdDocument }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
