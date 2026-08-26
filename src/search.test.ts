import { test } from "node:test";
import assert from "node:assert/strict";
import { findOccurrences, findAtTimestamp } from "./search.js";
import type { Cue } from "./srt.js";

function cue(text: string, index = 1): Cue {
  return { index, startMs: index * 1_000, endMs: index * 1_000 + 500, text };
}

test("finds a phrase that appears in multiple cues, in cue order", () => {
  const cues = [cue("not gonna happen", 1), cue("hello there", 2), cue("it's not gonna happen, John", 3)];

  const matches = findOccurrences(cues, "not gonna happen");

  assert.equal(matches.length, 2);
  assert.equal(matches[0]?.cue.index, 1);
  assert.equal(matches[1]?.cue.index, 3);
});

test("is case-insensitive by default", () => {
  const matches = findOccurrences([cue("Not Gonna Happen")], "not gonna happen");
  assert.equal(matches.length, 1);
});

test("is case-sensitive when requested", () => {
  const matches = findOccurrences([cue("Not Gonna Happen")], "not gonna happen", {
    caseSensitive: true,
  });
  assert.equal(matches.length, 0);
});

test("returns no matches for an empty phrase", () => {
  assert.deepEqual(findOccurrences([cue("anything")], ""), []);
});

test("returns no matches against an empty cue list", () => {
  assert.deepEqual(findOccurrences([], "anything"), []);
});

test("reports the character offset of the match", () => {
  const matches = findOccurrences([cue("well, not gonna happen")], "not gonna happen");
  assert.equal(matches[0]?.charOffset, 6);
});

test("matches phrases split by cue text alone, not across cues", () => {
  const matches = findOccurrences([cue("not gonna"), cue("happen")], "not gonna happen");
  assert.equal(matches.length, 0);
});

test("findAtTimestamp finds the cue on screen at a given moment", () => {
  const cues = [cue("first", 1), cue("second", 2)];
  const matches = findAtTimestamp(cues, 1_200);
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.text, "first");
});

test("findAtTimestamp returns nothing between cues", () => {
  const cues = [
    { index: 1, startMs: 1_000, endMs: 2_000, text: "first" },
    { index: 2, startMs: 3_000, endMs: 4_000, text: "second" },
  ];
  assert.deepEqual(findAtTimestamp(cues, 2_500), []);
});

test("findAtTimestamp treats a cue's end as exclusive", () => {
  const cues = [
    { index: 1, startMs: 1_000, endMs: 2_000, text: "first" },
    { index: 2, startMs: 2_000, endMs: 3_000, text: "second" },
  ];
  const matches = findAtTimestamp(cues, 2_000);
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.text, "second");
});

test("findAtTimestamp returns every cue that overlaps a moment", () => {
  const cues = [
    { index: 1, startMs: 1_000, endMs: 5_000, text: "background" },
    { index: 2, startMs: 2_000, endMs: 3_000, text: "foreground" },
  ];
  const matches = findAtTimestamp(cues, 2_500);
  assert.deepEqual(
    matches.map((m) => m.text),
    ["background", "foreground"]
  );
});
