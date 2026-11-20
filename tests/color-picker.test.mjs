import test from "node:test";
import assert from "node:assert/strict";
import { hsvToHex, hexToHsv } from "../src/lib/color/color-space.js";
import { pointToHueSat, hueSatToPoint } from "../src/lib/color/wheel-geometry.js";

test("primary and neutral colors convert to hex", () => {
  assert.equal(hsvToHex({ h: 0, s: 1, v: 1 }), "#ff0000");
  assert.equal(hsvToHex({ h: 120, s: 1, v: 1 }), "#00ff00");
  assert.equal(hsvToHex({ h: 240, s: 1, v: 1 }), "#0000ff");
  assert.equal(hsvToHex({ h: 360, s: 1, v: 1 }), "#ff0000");
  assert.equal(hsvToHex({ h: 200, s: 0, v: 1 }), "#ffffff");
  assert.equal(hsvToHex({ h: 200, s: 1, v: 0 }), "#000000");
});

test("hex survives a round trip through HSV", () => {
  for (const hex of ["#000000", "#ffffff", "#808080", "#ff8800", "#123456", "#c0ffee"]) {
    assert.equal(hsvToHex(hexToHsv(hex)), hex);
  }
});

test("wheel center is unsaturated and the rim is fully saturated", () => {
  assert.deepEqual(pointToHueSat(50, 50, 50), { h: 0, s: 0 });
  const top = pointToHueSat(50, 0, 50);
  assert.equal(Math.round(top.h), 90);
  assert.equal(top.s, 1);
  assert.equal(pointToHueSat(500, 50, 50).s, 1);
});

test("hue/saturation and wheel point are inverses", () => {
  const p = hueSatToPoint(210, 0.4, 80);
  const back = pointToHueSat(p.x, p.y, 80);
  assert.ok(Math.abs(back.h - 210) < 1e-9);
  assert.ok(Math.abs(back.s - 0.4) < 1e-9);
});
