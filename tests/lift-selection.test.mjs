import test from "node:test";
import assert from "node:assert/strict";
import { coversLayer } from "../src/editor/tools/helpers/lift-selection.js";

const layer = (x, y, width, height) => ({ x, y, canvas: { width, height } });
const selection = (x, y, w, h) => ({ bounds: { x, y, w, h } });

test("pixels already on their own layer are covered by their selection", () => {
  assert.equal(coversLayer(layer(30, 40, 100, 50), selection(30, 40, 100, 50)), true);
  // The selection reached past the source layer, so the lifted piece is smaller than it.
  assert.equal(coversLayer(layer(30, 40, 100, 50), selection(0, 0, 400, 300)), true);
});

test("a selection of part of a layer does not cover it", () => {
  assert.equal(coversLayer(layer(0, 0, 800, 600), selection(30, 40, 100, 50)), false);
  assert.equal(coversLayer(layer(30, 40, 100, 50), selection(31, 40, 100, 50)), false);
  assert.equal(coversLayer(layer(30, 40, 100, 50), selection(500, 500, 10, 10)), false);
});
