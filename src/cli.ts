import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { parseSrt, parseTimecode, formatTimecode, type Cue } from "./srt.js";
import { parseVtt } from "./vtt.js";
import { findOccurrences, findAtTimestamp } from "./search.js";

const USAGE = [
  "usage: subtitle-when <file.srt|file.vtt> <phrase>",
  "       subtitle-when <file.srt|file.vtt> --at <timecode>",
].join("\n");

function parseByExtension(filePath: string, content: string): Cue[] {
  return extname(filePath).toLowerCase() === ".vtt" ? parseVtt(content) : parseSrt(content);
}

function printCues(cues: readonly Cue[]): void {
  for (const cue of cues) {
    console.log(`${formatTimecode(cue.startMs)} --> ${formatTimecode(cue.endMs)}  ${cue.text}`);
  }
}

function main(argv: string[]): number {
  const [filePath, ...rest] = argv;

  if (!filePath || rest.length === 0) {
    console.error(USAGE);
    return 1;
  }

  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`could not read ${filePath}: ${message}`);
    return 1;
  }

  const cues = parseByExtension(filePath, content);

  if (rest[0] === "--at") {
    const timecodeArg = rest[1];
    if (!timecodeArg) {
      console.error(USAGE);
      return 1;
    }

    const timeMs = parseTimecode(timecodeArg);
    if (timeMs === null) {
      console.error(`"${timecodeArg}" is not a valid timecode (expected HH:MM:SS,mmm)`);
      return 1;
    }

    const onScreen = findAtTimestamp(cues, timeMs);
    if (onScreen.length === 0) {
      console.log(`nothing is on screen at ${formatTimecode(timeMs)} in ${filePath}`);
      return 0;
    }

    printCues(onScreen);
    return 0;
  }

  const phrase = rest.join(" ");
  const matches = findOccurrences(cues, phrase, { caseSensitive: false });

  if (matches.length === 0) {
    console.log(`"${phrase}" does not appear in ${filePath}`);
    return 0;
  }

  printCues(matches.map((match) => match.cue));

  return 0;
}

process.exitCode = main(process.argv.slice(2));
