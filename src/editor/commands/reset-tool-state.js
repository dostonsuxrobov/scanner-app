// Clears transient tool state when the document is replaced or closed.
export function resetToolState(rt) {
  Object.values(rt.tools).forEach((tool) => tool.cancel?.(rt));
  rt.store.setState({ transform: null, crop: null, textEdit: null });
  rt.setLive(null);
}
