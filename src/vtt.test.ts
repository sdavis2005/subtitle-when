import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVtt } from "./vtt.js";

test("parses a well-formed multi-cue file with the WEBVTT header", () => {
  const cues = parseVtt(
    [
      "WEBVTT",
      "",
      "00:00:01.000 --> 00:00:03.500",
      "Look, it's not gonna happen.",
      "",
      "00:00:04.000 --> 00:00:06.200",
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

test("accepts an optional cue identifier line before the timing line", () => {
  const cues = parseVtt(
    ["WEBVTT", "", "intro-line", "00:00:01.000 --> 00:00:02.000", "hi"].join("\n")
  );

  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.text, "hi");
});

test("hours are optional in a cue's timing line", () => {
  const cues = parseVtt(
    ["WEBVTT", "", "00:01.000 --> 00:02.000", "hi"].join("\n")
  );

  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.startMs, 1_000);
  assert.equal(cues[0]?.endMs, 2_000);
});

test("ignores cue settings after the timing line", () => {
  const cues = parseVtt(
    ["WEBVTT", "", "00:00:01.000 --> 00:00:02.000 align:middle line:90%", "hi"].join("\n")
  );

  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.startMs, 1_000);
});

test("joins multi-line cue text with newlines", () => {
  const cues = parseVtt(
    ["WEBVTT", "", "00:00:01.000 --> 00:00:02.000", "line one", "line two"].join("\n")
  );

  assert.equal(cues[0]?.text, "line one\nline two");
});

test("skips NOTE, STYLE, and REGION blocks", () => {
  const cues = parseVtt(
    [
      "WEBVTT",
      "",
      "NOTE this is a comment",
      "spanning two lines",
      "",
      "STYLE",
      "::cue { color: yellow; }",
      "",
      "REGION",
      "id:bumper",
      "",
      "00:00:01.000 --> 00:00:02.000",
      "ok",
    ].join("\n")
  );

  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.text, "ok");
});

test("assigns sequential indices regardless of cue identifiers", () => {
  const cues = parseVtt(
    [
      "WEBVTT",
      "",
      "first",
      "00:00:01.000 --> 00:00:02.000",
      "a",
      "",
      "00:00:03.000 --> 00:00:04.000",
      "b",
    ].join("\n")
  );

  assert.equal(cues[0]?.index, 1);
  assert.equal(cues[1]?.index, 2);
});

test("handles CRLF line endings and a leading BOM", () => {
  const cues = parseVtt("﻿WEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\ntext\r\n");

  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.text, "text");
});

test("returns an empty list for empty or whitespace-only input", () => {
  assert.deepEqual(parseVtt(""), []);
  assert.deepEqual(parseVtt("\n\n   \n\n"), []);
});
