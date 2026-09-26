// Curved double-arrow cursor shown outside a transform box.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 14a8 8 0 0 1 13-7" stroke="#fff" stroke-width="4"/><path d="M5 14a8 8 0 0 1 13-7" stroke="#000" stroke-width="1.6"/><path d="M14 5l4 2-2 4" stroke="#fff" stroke-width="4"/><path d="M14 5l4 2-2 4" stroke="#000" stroke-width="1.6"/></g></svg>`;

export const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, alias`;
