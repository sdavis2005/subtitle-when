import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSrt, formatTimecode, parseTimecode, sortCues } from "./srt.js";

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

test("sorts cues by start time even when the file lists them out of order", () => {
  const cues = parseSrt(
    [
      "2",
      "00:01:00,000 --> 00:01:02,000",
      "second",
      "",
      "1",
      "00:00:01,000 --> 00:00:03,000",
      "first",
    ].join("\n")
  );

  assert.equal(cues[0]?.text, "first");
  assert.equal(cues[1]?.text, "second");
});

test("sortCues preserves overlapping cues and breaks ties by end time then index", () => {
  const sorted = sortCues([
    { index: 3, startMs: 1_000, endMs: 5_000, text: "background" },
    { index: 2, startMs: 1_000, endMs: 2_000, text: "short overlap" },
    { index: 1, startMs: 0, endMs: 1_000, text: "leads in" },
  ]);

  assert.deepEqual(
    sorted.map((c) => c.text),
    ["leads in", "short overlap", "background"]
  );
});

test("sortCues does not mutate the input array", () => {
  const cues = [
    { index: 2, startMs: 2_000, endMs: 3_000, text: "b" },
    { index: 1, startMs: 1_000, endMs: 2_000, text: "a" },
  ];
  const original = [...cues];

  sortCues(cues);

  assert.deepEqual(cues, original);
});

test("formatTimecode round-trips through parseSrt's own timecodes", () => {
  assert.equal(formatTimecode(1_000), "00:00:01,000");
  assert.equal(formatTimecode(3_723_045), "01:02:03,045");
});

test("formatTimecode clamps negative input to zero", () => {
  assert.equal(formatTimecode(-500), "00:00:00,000");
});

test("parseTimecode accepts full HH:MM:SS,mmm timecodes", () => {
  assert.equal(parseTimecode("01:02:03,045"), 3_723_045);
});

test("parseTimecode accepts a dot as the millisecond separator", () => {
  assert.equal(parseTimecode("01:02:03.045"), 3_723_045);
});

test("parseTimecode treats hours and milliseconds as optional", () => {
  assert.equal(parseTimecode("01:13"), 73_000);
  assert.equal(parseTimecode("0:01:13"), 73_000);
});

test("parseTimecode pads a short millisecond fraction", () => {
  assert.equal(parseTimecode("00:00:01.5"), 1_500);
});

test("parseTimecode rejects text that isn't a timecode", () => {
  assert.equal(parseTimecode("not a timecode"), null);
  assert.equal(parseTimecode(""), null);
});
