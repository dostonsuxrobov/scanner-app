import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchesCombo } from "../src/editor/keymap/combo.js";

const press = (key, code, mods = "") => ({ key, code, ctrlKey: mods.includes("c"), metaKey: mods.includes("m"), shiftKey: mods.includes("s"), altKey: mods.includes("a") });

// The combos one key press matches, out of those the editor binds.
const COMBOS = ["Mod+Z", "Mod+Shift+Z", "Mod+C", "Mod+J", "Mod+A", "Mod+I", "Mod+]", "Alt+N", "Alt+W", "Shift+1", "Shift+T", "B", "M", "T", "V"];
const hits = (event) => COMBOS.filter((combo) => matchesCombo(combo, event));

test("QWERTY shortcuts", () => {
  assert.deepEqual(hits(press("z", "KeyZ", "c")), ["Mod+Z"]);
  assert.deepEqual(hits(press("Z", "KeyZ", "cs")), ["Mod+Shift+Z"]);
  assert.deepEqual(hits(press("b", "KeyB")), ["B"]);
  assert.deepEqual(hits(press("!", "Digit1", "s")), ["Shift+1"]);
  assert.deepEqual(hits(press("]", "BracketRight", "c")), ["Mod+]"]);
  assert.deepEqual(hits(press("T", "KeyT", "s")), ["Shift+T"]);
  assert.deepEqual(hits(press("t", "KeyT")), ["T"]);
});

test("on Dvorak and AZERTY the typed letter decides, not the key's position", () => {
  assert.deepEqual(hits(press("j", "KeyC", "c")), ["Mod+J"]); // Dvorak J sits on QWERTY's C
  assert.deepEqual(hits(press("q", "KeyA", "c")), []); // AZERTY Q sits on QWERTY's A
  assert.deepEqual(hits(press("a", "KeyQ", "c")), ["Mod+A"]);
  assert.deepEqual(hits(press(",", "KeyM")), []); // AZERTY comma sits on QWERTY's M
  assert.deepEqual(hits(press("m", "Semicolon")), ["M"]);
});

test("layouts without Latin letters fall back to the physical key", () => {
  assert.deepEqual(hits(press("я", "KeyZ", "c")), ["Mod+Z"]); // Cyrillic
  assert.deepEqual(hits(press("и", "KeyB")), ["B"]);
  assert.deepEqual(hits(press("Dead", "KeyN", "a")), ["Alt+N"]); // ⌥N on a Mac
  assert.deepEqual(hits(press("∑", "KeyW", "a")), ["Alt+W"]); // ⌥W on a Mac
});

test("no command is bound to Ctrl/⌘+T, which browsers keep for 'new tab'", () => {
  // Read as text: the keymap module pulls in the whole app, which node cannot load.
  const keymap = readFileSync(new URL("../src/editor/keymap/keymap.js", import.meta.url), "utf8");
  assert.ok(!/keys: \[[^\]]*"Mod\+T"/.test(keymap));
});
