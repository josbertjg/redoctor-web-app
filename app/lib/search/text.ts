/*
 * Matching what a person types against names: specialties of the catalog,
 * a place's name, a specialist's name. Case and accents never matter («cardio»
 * finds «Cardiología», «MEDICO» finds «Médico»), a match at the start of a
 * word ranks over one inside it, and the match is reported on the original
 * text, so the suggestion can show the letters that matched.
 */

/** Where the typed text sits inside the original one. */
export type TextMatch = {
  start: number;
  end: number;
  /** It begins a word («Cardio» in «Cardiología»), not the middle of one. */
  atWordStart: boolean;
};

/** Lowercase, no accents, no doubled spaces: the shape two texts are compared in. */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim();
}

type FoldedText = {
  text: string;
  /** For each folded character, where its original one starts and ends. */
  starts: number[];
  ends: number[];
};

/** The folded text with the way back to each original character. */
function foldWithIndices(text: string): FoldedText {
  const chars: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  for (const char of text) {
    const folded = char
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLocaleLowerCase('es');
    for (const foldedChar of folded) {
      chars.push(foldedChar);
      starts.push(offset);
      ends.push(offset + char.length);
    }
    offset += char.length;
  }
  return { text: chars.join(''), starts, ends };
}

const isWordChar = (char: string | undefined) =>
  char !== undefined && /[\p{L}\p{N}]/u.test(char);

/**
 * The first place the typed text appears in `text`, case and accents aside:
 * at a word's start when it appears at one, anywhere otherwise; null when it
 * does not appear or nothing was typed.
 */
export function findMatch(text: string, typed: string): TextMatch | null {
  const needle = foldText(typed);
  if (needle === '') return null;
  const folded = foldWithIndices(text);

  let index = -1;
  let atWordStart = false;
  for (
    let from = folded.text.indexOf(needle);
    from !== -1;
    from = folded.text.indexOf(needle, from + 1)
  ) {
    if (index === -1) index = from;
    if (!isWordChar(folded.text[from - 1])) {
      index = from;
      atWordStart = true;
      break;
    }
  }
  if (index === -1) return null;

  const start = folded.starts[index];
  const end = folded.ends[index + needle.length - 1];
  if (start === undefined || end === undefined) return null;
  return { start, end, atWordStart };
}

/**
 * Which of two matches should come first: a word-start match before one
 * inside a word, then the one nearer the start, then the shorter name.
 */
export function compareMatches(
  a: { match: TextMatch; text: string },
  b: { match: TextMatch; text: string },
): number {
  if (a.match.atWordStart !== b.match.atWordStart) {
    return a.match.atWordStart ? -1 : 1;
  }
  if (a.match.start !== b.match.start) return a.match.start - b.match.start;
  return a.text.length - b.text.length;
}

/** The three pieces a highlighted suggestion is drawn from. */
export function splitMatch(
  text: string,
  match: TextMatch | null,
): { before: string; matched: string; after: string } {
  if (!match) return { before: text, matched: '', after: '' };
  return {
    before: text.slice(0, match.start),
    matched: text.slice(match.start, match.end),
    after: text.slice(match.end),
  };
}
