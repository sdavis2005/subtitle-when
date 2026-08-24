import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { parseSrt, formatTimecode, type Cue } from "./srt.js";
import { parseVtt } from "./vtt.js";
import { findOccurrences } from "./search.js";

function parseByExtension(filePath: string, content: string): Cue[] {
  return extname(filePath).toLowerCase() === ".vtt" ? parseVtt(content) : parseSrt(content);
}

function main(argv: string[]): number {
  const [filePath, ...phraseParts] = argv;
  const phrase = phraseParts.join(" ");

  if (!filePath || !phrase) {
    console.error("usage: subtitle-when <file.srt|file.vtt> <phrase>");
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
  const matches = findOccurrences(cues, phrase, { caseSensitive: false });

  if (matches.length === 0) {
    console.log(`"${phrase}" does not appear in ${filePath}`);
    return 0;
  }

  for (const { cue } of matches) {
    console.log(`${formatTimecode(cue.startMs)} --> ${formatTimecode(cue.endMs)}  ${cue.text}`);
  }

  return 0;
}

process.exitCode = main(process.argv.slice(2));
