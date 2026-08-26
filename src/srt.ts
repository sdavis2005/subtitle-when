export interface Cue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

const TIMECODE_LINE = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

function timecodeToMs(hh: string, mm: string, ss: string, ms: string): number {
  return (
    Number(hh) * 3_600_000 +
    Number(mm) * 60_000 +
    Number(ss) * 1_000 +
    Number(ms)
  );
}

/**
 * Parses SRT file contents into an ordered list of cues.
 *
 * Deliberately lenient: blocks with a missing or non-numeric index are
 * still parsed (index falls back to position in the file), since plenty
 * of subtitle files in the wild are hand-edited and slightly malformed.
 */
export function parseSrt(content: string): Cue[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/﻿/, "");
  const blocks = normalized.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  const cues: Cue[] = [];

  blocks.forEach((block, position) => {
    const lines = block.split("\n");
    let cursor = 0;

    let index = position + 1;
    if (/^\d+$/.test(lines[cursor] ?? "")) {
      index = Number(lines[cursor]);
      cursor += 1;
    }

    const timecodeLine = lines[cursor] ?? "";
    const match = TIMECODE_LINE.exec(timecodeLine);
    if (!match) {
      return;
    }
    cursor += 1;

    const [, sh, sm, ss, sms, eh, em, es, ems] = match;
    const startMs = timecodeToMs(sh, sm, ss, sms);
    const endMs = timecodeToMs(eh, em, es, ems);

    const text = lines.slice(cursor).join("\n").trim();

    cues.push({ index, startMs, endMs, text });
  });

  return cues;
}

const USER_TIMECODE = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})(?:[,.](\d{1,3}))?$/;

/**
 * Parses a timecode typed by a person (as opposed to one read from a
 * subtitle file) into milliseconds. Hours and the millisecond component
 * are both optional, and either "," or "." works as the ms separator, so
 * "1:13", "0:01:13.5", and "00:01:13,500" are all accepted. Returns null
 * for anything that doesn't look like a timecode.
 */
export function parseTimecode(text: string): number | null {
  const match = USER_TIMECODE.exec(text.trim());
  if (!match) {
    return null;
  }

  const [, hh, mm, ss, ms] = match;
  const millis = ms ? ms.padEnd(3, "0") : "0";
  return timecodeToMs(hh ?? "0", mm, ss, millis);
}

/** Formats milliseconds back into an SRT-style "HH:MM:SS,mmm" timecode. */
export function formatTimecode(totalMs: number): string {
  const ms = Math.max(0, Math.round(totalMs));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  const millis = ms % 1_000;

  const pad = (n: number, width: number) => String(n).padStart(width, "0");

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}
