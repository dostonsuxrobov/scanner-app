import test from "node:test";
import assert from "node:assert/strict";
import { controlKeepsKey } from "../src/editor/keymap/typing-target.js";

const key = (k, mods = {}) => ({ key: k, ctrlKey: false, metaKey: false, ...mods });
const input = (type) => ({ tagName: "INPUT", type });

test("text fields keep every key", () => {
  for (const target of [input("text"), input("number"), { tagName: "INPUT" }, { tagName: "TEXTAREA" }, { tagName: "DIV", isContentEditable: true }]) {
    assert.equal(controlKeepsKey(target, key("b")), true);
    assert.equal(controlKeepsKey(target, key("z", { ctrlKey: true })), true);
    assert.equal(controlKeepsKey(target, key("Backspace")), true);
  }
});

test("sliders and checkboxes keep only the keys they act on", () => {
  for (const target of [input("range"), input("checkbox"), input("color")]) {
    assert.equal(controlKeepsKey(target, key("ArrowLeft")), true);
    assert.equal(controlKeepsKey(target, key(" ")), true);
    assert.equal(controlKeepsKey(target, key("z", { ctrlKey: true })), false, "undo works right after dragging a slider");
    assert.equal(controlKeepsKey(target, key("z", { metaKey: true })), false);
    assert.equal(controlKeepsKey(target, key("b")), false);
    assert.equal(controlKeepsKey(target, key("[")), false);
    assert.equal(controlKeepsKey(target, key("Delete")), false);
  }
});

test("dropdowns keep plain keys (type-ahead, arrows) but not Ctrl/⌘ combos", () => {
  const select = { tagName: "SELECT" };
  assert.equal(controlKeepsKey(select, key("m")), true);
  assert.equal(controlKeepsKey(select, key("ArrowDown")), true);
  assert.equal(controlKeepsKey(select, key("z", { ctrlKey: true })), false);
});

test("buttons and the canvas keep nothing", () => {
  assert.equal(controlKeepsKey({ tagName: "BUTTON" }, key("b")), false);
  assert.equal(controlKeepsKey({ tagName: "CANVAS" }, key("ArrowLeft")), false);
});
