import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSrt, formatTimecode } from "./srt.js";

test("parses a well-formed multi-cue file", () => {
  const cues = parseSrt(
    [
      "1",
      "00:00:01,000 --> 00:00:03,500",
      "Look, it's not gonna happen.",
      "",
      "2",
      "00:00:04,000 --> 00:00:06,200",
      "What do you mean?",
      "",
    ].join("\n")
  );

  assert.equal(cues.length, 2);
  assert.deepEqual(cues[0], {
    index: 1,
    startMs: 1_000,
    endMs: 3_500,
    text: "Look, it's not gonna happen.",
  });
  assert.equal(cues[1]?.text, "What do you mean?");
});

test("joins multi-line cue text with newlines", () => {
  const cues = parseSrt(
    ["1", "00:00:01,000 --> 00:00:02,000", "line one", "line two"].join("\n")
  );

  assert.equal(cues[0]?.text, "line one\nline two");
});

test("accepts a dot as the millisecond separator", () => {
  const cues = parseSrt(["1", "00:00:01.000 --> 00:00:02.000", "hi"].join("\n"));

  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.startMs, 1_000);
});

test("falls back to positional index when the index line is missing", () => {
  const cues = parseSrt(
    [
      "00:00:01,000 --> 00:00:02,000",
      "first",
      "",
      "00:00:03,000 --> 00:00:04,000",
      "second",
    ].join("\n")
  );

  assert.equal(cues.length, 2);
  assert.equal(cues[0]?.index, 1);
  assert.equal(cues[1]?.index, 2);
});

test("skips blocks with no valid timecode line", () => {
  const cues = parseSrt(
    ["1", "not a timecode", "text", "", "2", "00:00:01,000 --> 00:00:02,000", "ok"].join("\n")
  );

  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.text, "ok");
});

test("handles CRLF line endings and a leading BOM", () => {
  const cues = parseSrt(
    "﻿1\r\n00:00:01,000 --> 00:00:02,000\r\ntext\r\n"
  );

  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.text, "text");
});

test("returns an empty list for empty or whitespace-only input", () => {
  assert.deepEqual(parseSrt(""), []);
  assert.deepEqual(parseSrt("\n\n   \n\n"), []);
});

test("formatTimecode round-trips through parseSrt's own timecodes", () => {
  assert.equal(formatTimecode(1_000), "00:00:01,000");
  assert.equal(formatTimecode(3_723_045), "01:02:03,045");
});

test("formatTimecode clamps negative input to zero", () => {
  assert.equal(formatTimecode(-500), "00:00:00,000");
});
