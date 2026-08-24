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

## Building

There are no dependencies to install. Compile with `tsc` (any recent
TypeScript compiler) and run the output with Node:

```
tsc
node dist/cli.js movie.srt "not gonna happen"
```

## Testing

Unit tests cover `parseSrt`, `parseVtt`, `formatTimecode`, and
`findOccurrences` and live next to the code they test (`src/*.test.ts`).
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
  phrase and returns which ones matched. It doesn't know or care where
  the cues came from.
- `formatTimecode(ms): string` turns milliseconds back into the
  `HH:MM:SS,mmm` format SRT files use.

`src/cli.ts` is the only file that touches the filesystem or process
argv. Everything it does is a thin wrapper: read a file, pick a parser
by extension, call the pure functions above, print the result. That
split is the point of this project — the parsing and query logic can be
tested with plain strings in, plain data out, no mocking a filesystem or
a video player.

## Limitations (for now)

- No ASS/SSA support.
- Search is a plain substring match, not fuzzy or regex.
- No timestamp-based query yet ("what's on screen at 00:12:30") — that's
  a different question from the one this tool currently answers.
