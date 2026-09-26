// Crosshair cursors carrying a small mode badge, as in GIMP: "+" adds to the
// selection, "−" subtracts, "∩" intersects. Replace mode is a plain crosshair.
const cross =
  '<path d="M11 1v8M11 13v8M1 11h8M13 11h8" stroke="#fff" stroke-width="3"/>' +
  '<path d="M11 1v8M11 13v8M1 11h8M13 11h8" stroke="#000" stroke-width="1"/>';

const BADGES = {
  add: '<path d="M24 18v10M19 23h10"/>',
  subtract: '<path d="M19 23h10"/>',
  intersect: '<path d="M19.5 28v-4a4.5 4.5 0 0 1 9 0v4"/>',
};

function badge(shape) {
  return (
    `<g fill="none" stroke-linecap="round"><g stroke="#fff" stroke-width="5">${shape}</g>` +
    `<g stroke="#000" stroke-width="2">${shape}</g></g>`
  );
}

const cache = {};

export function selectionCursor(mode) {
  if (!BADGES[mode]) return "crosshair";
  cache[mode] ??= `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${cross}${badge(BADGES[mode])}</svg>`,
  )}") 11 11, crosshair`;
  return cache[mode];
}
