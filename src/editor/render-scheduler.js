// Coalesces repaint requests into one paint per animation frame, per channel
// ("document" for the image, "overlay" for selection outlines and handles).
export function createRenderScheduler() {
  const painters = { document: new Set(), overlay: new Set() };
  const pending = new Set();
  let frame = 0;

  function run() {
    frame = 0;
    const channels = [...pending];
    pending.clear();
    for (const channel of channels) painters[channel].forEach((paint) => paint());
  }

  return {
    request(...channels) {
      for (const c of channels.length ? channels : ["document", "overlay"]) pending.add(c);
      if (!frame) frame = requestAnimationFrame(run);
    },
    add(channel, paint) {
      painters[channel].add(paint);
      return () => painters[channel].delete(paint);
    },
    cancel() {
      cancelAnimationFrame(frame);
      frame = 0;
      pending.clear();
    },
  };
}
