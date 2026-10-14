import { splitMatch, type TextMatch } from '@/app/lib/search/text';

/** A suggestion's name with the letters that matched in bold. */
export function Highlight({
  text,
  match,
}: {
  text: string;
  match: TextMatch | null;
}) {
  const { before, matched, after } = splitMatch(text, match);
  return (
    <>
      {before}
      {matched === '' ? null : (
        <mark className="bg-transparent font-semibold text-current">
          {matched}
        </mark>
      )}
      {after}
    </>
  );
}
