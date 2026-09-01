import type { Cue } from "./srt.js";

export interface SearchOptions {
  caseSensitive?: boolean;
  /** Treat `phrase` as a JavaScript regular expression instead of a literal substring. */
  regex?: boolean;
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
 *
 * Throws if `options.regex` is set and `phrase` is not a valid pattern, so
 * the caller (the CLI) can report the bad pattern instead of silently
 * treating it as "no matches".
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

  if (options.regex) {
    let pattern: RegExp;
    try {
      pattern = new RegExp(phrase, caseSensitive ? "" : "i");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`invalid regex "${phrase}": ${reason}`);
    }

    const matches: Match[] = [];
    for (const cue of cues) {
      const found = pattern.exec(cue.text);
      if (found) {
        matches.push({ cue, charOffset: found.index });
      }
    }
    return matches;
  }

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

/**
 * Finds every cue that is on screen at the given moment, in cue order.
 *
 * A cue is "on screen" for the half-open interval [startMs, endMs) — this
 * keeps a cue that ends exactly when the next one begins from matching
 * both, which is how adjacent subtitles are usually authored.
 */
export function findAtTimestamp(cues: readonly Cue[], timeMs: number): Cue[] {
  return cues.filter((cue) => timeMs >= cue.startMs && timeMs < cue.endMs);
}
