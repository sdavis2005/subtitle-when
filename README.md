# subtitle-when

You're watching a movie clip, you remember a line, and you want to know
exactly when it's said so you can cut to it. Or you have a translated
`.srt` and want to check whether a specific phrase made it into the
subtitles at all. Scrubbing through a video player to find one line is
slow and imprecise.

`subtitle-when` answers exactly that question and nothing else: given a
subtitle file (SRT or WebVTT) and a phrase, it prints the timecode of
every cue that contains it.

## Usage

```
subtitle-when movie.srt "not gonna happen"
```

The file format is picked from the extension: `.vtt` is parsed as
WebVTT, anything else is parsed as SRT.

Given this `movie.srt`:

```
1
00:00:01,000 --> 00:00:03,500
Look, it's not gonna happen.

2
00:00:04,000 --> 00:00:06,200
What do you mean?

3
00:01:12,800 --> 00:01:15,000
I said it's not gonna happen, John.
```

Output:

```
00:00:01,000 --> 00:00:03,500  Look, it's not gonna happen.
00:01:12,800 --> 00:01:15,000  I said it's not gonna happen, John.
```

If nothing matches, it says so instead of printing nothing:

```
"xyz" does not appear in movie.srt
```

By default the search is a plain, case-insensitive substring match. Add
`--case-sensitive` to require exact case, or `--regex` to treat the phrase
as a JavaScript regular expression (still case-insensitive unless combined
with `--case-sensitive`):

```
subtitle-when movie.srt --regex "gonna|going to"
```

To go the other direction — what's being said at a given moment instead of
when a given line is said — pass `--at` with a timecode instead of a
phrase:

```
subtitle-when movie.srt --at 00:01:13
```

```
00:01:12,800 --> 00:01:15,000  I said it's not gonna happen, John.
```

The timecode accepts the same `HH:MM:SS,mmm` format the file itself uses,
but hours and the millisecond fraction are both optional, so `1:13`,
`0:01:13.5`, and `00:01:13,500` all work. If the moment falls between
cues, or after the last one ends, it says so:

```
nothing is on screen at 00:01:13,000 in movie.srt
```

## Building

There are no dependencies to install. Compile with `tsc` (any recent
TypeScript compiler) and run the output with Node:

```
tsc
node dist/cli.js movie.srt "not gonna happen"
```

## Testing

Unit tests cover `parseSrt`, `parseVtt`, `formatTimecode`, `parseTimecode`,
`findOccurrences`, and `findAtTimestamp`, and live next to the code they
test (`src/*.test.ts`).
They use Node's
built-in test runner, so there's nothing to install:

```
npm test
```

## Design

The parsing and search logic are plain, pure functions over plain data:

- `parseSrt(content: string): Cue[]` turns raw SRT text into a list of
  `{ index, startMs, endMs, text }` cues. No file access, no globals.
- `parseVtt(content: string): Cue[]` does the same for WebVTT text,
  producing the same `Cue[]` shape so the rest of the tool doesn't need
  to know which format a file came from.
- `findOccurrences(cues, phrase, options): Match[]` scans cues for a
  phrase and returns which ones matched. `options.caseSensitive` and
  `options.regex` control how the phrase is matched; it doesn't know or
  care where the cues came from.
- `findAtTimestamp(cues, timeMs): Cue[]` returns every cue on screen at a
  given moment, using a half-open `[startMs, endMs)` interval so adjacent
  cues don't both match the instant one ends and the next begins.
- `formatTimecode(ms): string` turns milliseconds back into the
  `HH:MM:SS,mmm` format SRT files use.
- `parseTimecode(text): number | null` is the inverse, for turning a
  timecode a person typed on the command line into milliseconds.

`src/cli.ts` is the only file that touches the filesystem or process
argv. Everything it does is a thin wrapper: read a file, pick a parser
by extension, call the pure functions above, print the result. That
split is the point of this project — the parsing and query logic can be
tested with plain strings in, plain data out, no mocking a filesystem or
a video player.

## Limitations (for now)

- No ASS/SSA support.
- Search is exact (substring or regex), not fuzzy.
- `findAtTimestamp` assumes cues don't need reconciling if a file has
  overlapping or out-of-order cues, it returns whatever matches as-is.
