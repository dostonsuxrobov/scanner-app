import test from "node:test";
import assert from "node:assert/strict";
import { fileKind, baseName } from "../src/editor/engine/io/file-kind.js";
import { fitWithinLimits } from "../src/editor/engine/io/fit-limits.js";
import { validateProject } from "../src/editor/engine/io/project-format.js";

test("files are classified by type or extension", () => {
  assert.equal(fileKind({ name: "scan.PDF", type: "" }), "pdf");
  assert.equal(fileKind({ name: "a.png", type: "image/png" }), "image");
  assert.equal(fileKind({ name: "work.project.json", type: "" }), "project");
  assert.equal(fileKind({ name: "notes.txt", type: "text/plain" }), "unknown");
  assert.equal(baseName("photo.final.jpg"), "photo.final");
});

test("oversized images are reduced proportionally", () => {
  const fit = fitWithinLimits(20000, 10000);
  assert.ok(fit.scaled && fit.width <= 8000 && fit.width * fit.height <= 36_000_000);
  assert.ok(Math.abs(fit.width / fit.height - 2) < 0.01);
  assert.deepEqual(fitWithinLimits(100, 50), { width: 100, height: 50, scaled: false });
});

const layer = (props = {}) => ({ id: "a", name: "L", src: "data:image/png;base64,AA", x: 0, y: 0, opacity: 100, blend: "source-over", ...props });
const project = (doc = {}) => ({ type: "simple-editor-project", version: 3, document: { width: 10, height: 10, layers: [layer()], ...doc } });

test("valid projects pass, including older versions", () => {
  assert.ok(validateProject(project()));
  assert.ok(validateProject({ ...project(), version: 2 }));
});

test("damaged projects are rejected with a reason", () => {
  assert.throws(() => validateProject({ type: "other" }), /not an editor project/);
  assert.throws(() => validateProject(project({ width: 0 })), /canvas size/);
  assert.throws(() => validateProject(project({ layers: [layer({ blend: "nope" })] })), /damaged/);
  assert.throws(() => validateProject(project({ layers: [layer(), layer()] })), /duplicate/);
});
