import test from "node:test";
import assert from "node:assert/strict";
import { pushStep } from "../src/lib/page-history.js";
import { pdfPageSize } from "../src/lib/pdf/pdf-page-size.js";
import { cropSize } from "../src/lib/document/crop-size.js";
import { fromRecord, toRecord } from "../src/lib/page-record.js";
import { projectPage } from "./document-fixture.mjs";

const step = (size, tag) => ({ blob: { size }, width: 1, height: 1, paper: null, tag });

test("undo steps are kept oldest first, up to the step limit", () => {
  let steps = [];
  for (let i = 0; i < 5; i++) steps = pushStep(steps, step(10, i), { maxSteps: 3 });
  assert.deepEqual(steps.map((s) => s.tag), [2, 3, 4]);
});

test("the oldest undo steps go when the steps hold too many bytes, but the latest stays", () => {
  let steps = [];
  for (let i = 0; i < 4; i++) steps = pushStep(steps, step(40, i), { maxBytes: 100 });
  assert.deepEqual(steps.map((s) => s.tag), [2, 3]);
  assert.deepEqual(pushStep([], step(500, "big"), { maxBytes: 100 }).map((s) => s.tag), ["big"]);
});

test("a known paper size gives the PDF page exactly that size, in either orientation", () => {
  assert.deepEqual(pdfPageSize(2481, 3508, "A4"), { width: 595.28, height: 841.89 });
  assert.deepEqual(pdfPageSize(3300, 2550, "Letter"), { width: 792, height: 612 });
});

test("a page shaped exactly like a standard sheet gets that sheet's size", () => {
  assert.deepEqual(pdfPageSize(1224, 1584), { width: 612, height: 792 }); // a Letter page rendered at 144 dpi
  assert.deepEqual(pdfPageSize(3508, 2480), { width: 841.89, height: 595.28 });
});

test("a page of unknown size keeps its proportions at the length of an A4 sheet", () => {
  const size = pdfPageSize(4000, 2000);
  assert.ok(Math.abs(size.width - 841.89) < 1e-9 && Math.abs(size.height - 420.945) < 1e-9);
});

test("a crop of a page seen in perspective comes out in the page's true proportions", () => {
  const corners = projectPage({}); // an A4 sheet (210 × 297), tilted
  const size = cropSize(corners, 800, 600);
  assert.ok(Math.abs(size.width / size.height - 210 / 297) < 0.03, `${size.width}×${size.height}`);
});

test("an upright rectangular crop keeps its pixel size", () => {
  const size = cropSize([{ x: 100, y: 50 }, { x: 500, y: 50 }, { x: 500, y: 250 }, { x: 100, y: 250 }], 800, 600);
  assert.deepEqual(size, { width: 400, height: 200 });
});

test("a page survives the round trip through its stored record", async () => {
  const image = { blob: { size: 3 }, width: 20, height: 30, paper: "A4" };
  const page = { id: "p1", name: "scan.jpg", createdAt: 1, ...image, original: image };
  const record = toRecord(page, 4);
  assert.equal(record.order, 4);
  assert.deepEqual(await fromRecord(record), page);
});

test("a record from an earlier version, holding data URLs, becomes a page with Blobs", async () => {
  const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const page = await fromRecord({ id: "old", name: "a.png", createdAt: 1, order: 0, src: pixel, originalSrc: pixel, width: 1, height: 1, originalWidth: 1, originalHeight: 1 });
  assert.ok(page.blob instanceof Blob && page.blob.size > 0);
  assert.equal(page.original.blob, page.blob);
  assert.equal("src" in page || "originalSrc" in page, false);
});
