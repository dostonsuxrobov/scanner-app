// Folds all menus into one list with section headings, for small screens
// where a row of menus (and side-opening submenus) does not fit.
export function compactMenus(menus) {
  const items = [];
  for (const menu of menus) {
    items.push({ heading: menu.label });
    for (const item of menu.items) {
      if (!item.submenu) {
        if (!item.separator) items.push(item);
        continue;
      }
      if (item.disabled || !item.submenu.length) continue;
      items.push({ heading: item.label, sub: true });
      items.push(...item.submenu);
    }
  }
  return [{ label: "Menu", items, compact: true }];
}
