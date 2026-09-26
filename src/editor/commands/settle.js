// Finishes in-progress tool work (pending transform, text being typed) so a
// command operates on a consistent document. Returns false if it could not.
export function settle(rt) {
  const { transform, textEdit } = rt.store.getState();
  if (transform && !rt.tools.scale.apply(rt)) return false;
  if (textEdit) rt.tools.text.commitNow(rt);
  return true;
}
