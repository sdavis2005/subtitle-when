import { readFileSync } from "node:fs";
import { parseSrt, formatTimecode } from "./srt.js";
import { findOccurrences } from "./search.js";

function main(argv: string[]): number {
  const [filePath, ...phraseParts] = argv;
  const phrase = phraseParts.join(" ");

  if (!filePath || !phrase) {
    console.error("usage: subtitle-when <file.srt> <phrase>");
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

  const cues = parseSrt(content);
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
