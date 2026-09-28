// Downloads a model file once and keeps it in the browser's Cache Storage,
// reporting progress. Later uses (and offline use) read it from the cache.
const CACHE_NAME = "scanner-models-v1";

async function openCache() {
  try {
    return "caches" in self ? await caches.open(CACHE_NAME) : null;
  } catch {
    return null; // e.g. storage disabled; the model is simply re-downloaded
  }
}

// onProgress(fraction 0–1, or null when the size is unknown)
export async function fetchModel(url, onProgress) {
  const cache = await openCache();
  const cached = cache && (await cache.match(url));
  if (cached) return new Uint8Array(await cached.arrayBuffer());
  const response = await fetch(url);
  if (!response.ok) throw new Error(`the page-flattening model could not be downloaded (${response.status})`);
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(total ? Math.min(1, loaded / total) : null);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  cache?.put(url, new Response(bytes.slice())).catch(() => {});
  return bytes;
}
