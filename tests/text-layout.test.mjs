import test from "node:test";
import assert from "node:assert/strict";
import { layoutLines, lineOffset } from "../src/editor/engine/text/text-layout.js";

const measure = (text) => text.length * 10; // every character is 10 px wide

test("point text only breaks at explicit newlines", () => {
  const lines = layoutLines("hello world\nbye", null, measure);
  assert.deepEqual(lines.map((l) => l.text), ["hello world", "bye"]);
});

test("box text wraps at word boundaries", () => {
  const lines = layoutLines("the quick brown fox", 100, measure);
  assert.deepEqual(lines.map((l) => l.text), ["the quick", "brown fox"]);
});

test("words longer than the box are split", () => {
  const lines = layoutLines("abcdefghijkl", 50, measure);
  assert.deepEqual(lines.map((l) => l.text), ["abcde", "fghij", "kl"]);
});

test("empty paragraphs keep their line", () => {
  assert.equal(layoutLines("a\n\nb", 100, measure).length, 3);
});

test("alignment offsets", () => {
  assert.equal(lineOffset("left", 100, 40), 0);
  assert.equal(lineOffset("center", 100, 40), 30);
  assert.equal(lineOffset("right", 100, 40), 60);
});
