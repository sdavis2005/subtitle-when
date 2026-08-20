import type { Cue } from "./srt.js";

export interface SearchOptions {
  caseSensitive?: boolean;
}

export interface Match {
  cue: Cue;
  /** Index of the match within cue.text, using the same casing as the search. */
  charOffset: number;
}

/**
 * Finds every cue whose text contains the given phrase, in cue order.
 *
 * This is the one question the tool answers: "when is this phrase said?"
 * Everything else (formatting, file I/O) lives outside this function so
 * the search logic itself stays a pure string operation over plain data.
 */
export function findOccurrences(
  cues: readonly Cue[],
  phrase: string,
  options: SearchOptions = {}
): Match[] {
  if (phrase.length === 0) {
    return [];
  }

  const caseSensitive = options.caseSensitive ?? false;
  const needle = caseSensitive ? phrase : phrase.toLowerCase();

  const matches: Match[] = [];
  for (const cue of cues) {
    const haystack = caseSensitive ? cue.text : cue.text.toLowerCase();
    const charOffset = haystack.indexOf(needle);
    if (charOffset !== -1) {
      matches.push({ cue, charOffset });
    }
  }

  return matches;
}
