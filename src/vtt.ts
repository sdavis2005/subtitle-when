import type { Cue } from "./srt.js";

const TIMECODE_LINE =
  /(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})/;

function timecodeToMs(hh: string | undefined, mm: string, ss: string, ms: string): number {
  return (
    Number(hh ?? 0) * 3_600_000 +
    Number(mm) * 60_000 +
    Number(ss) * 1_000 +
    Number(ms)
  );
}

/**
 * Parses WebVTT file contents into an ordered list of cues, reusing the
 * same Cue shape as parseSrt so search/formatting code doesn't need to
 * care which format a file came from.
 *
 * WEBVTT header, NOTE, STYLE, and REGION blocks are skipped since they
 * carry no cue text. A cue's identifier line is optional (unlike SRT's
 * numeric index, it can be any string), and its timing line's hours
 * component is optional, so "MM:SS.mmm" and "HH:MM:SS.mmm" both parse.
 */
export function parseVtt(content: string): Cue[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/^﻿/, "");
  const blocks = normalized.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  const cues: Cue[] = [];
  let nextIndex = 1;

  for (const block of blocks) {
    const lines = block.split("\n");
    const firstLine = lines[0] ?? "";

    if (/^WEBVTT(\s|$)/.test(firstLine) || /^NOTE(\s|$)/.test(firstLine) || /^(STYLE|REGION)(\s|$)/.test(firstLine)) {
      continue;
    }

    let cursor = 0;
    let match = TIMECODE_LINE.exec(lines[cursor] ?? "");
    if (!match) {
      cursor += 1;
      match = TIMECODE_LINE.exec(lines[cursor] ?? "");
    }
    if (!match) {
      continue;
    }
    cursor += 1;

    const [, sh, sm, ss, sms, eh, em, es, ems] = match;
    const text = lines.slice(cursor).join("\n").trim();

    cues.push({
      index: nextIndex,
      startMs: timecodeToMs(sh, sm, ss, sms),
      endMs: timecodeToMs(eh, em, es, ems),
      text,
    });
    nextIndex += 1;
  }

  return cues;
}
