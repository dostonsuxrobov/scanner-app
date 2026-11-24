import test from "node:test";
import assert from "node:assert/strict";
import { EXPORT_FORMATS, writtenFormat } from "../src/editor/engine/io/export-formats.js";

test("the blob's own type decides what was written", () => {
  assert.equal(writtenFormat({ type: "image/webp" }, "webp"), "webp");
  assert.equal(writtenFormat({ type: "image/png" }, "webp"), "png"); // a browser that cannot encode WebP
  assert.equal(EXPORT_FORMATS[writtenFormat({ type: "image/png" }, "webp")].ext, "png");
  assert.equal(writtenFormat({ type: "image/jpeg" }, "jpg"), "jpg");
  assert.equal(writtenFormat({ type: "application/pdf" }, "pdf"), "pdf");
});

test("an unknown or missing type keeps the requested format", () => {
  assert.equal(writtenFormat({ type: "" }, "png"), "png");
  assert.equal(writtenFormat({ type: "image/x-unknown" }, "jpg"), "jpg");
});
