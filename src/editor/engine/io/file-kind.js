// Classifies a user-supplied file by MIME type, falling back to its extension.
export function fileKind(file) {
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".json") || type === "application/json") return "project";
  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|avif|svg|ico)$/.test(name)) return "image";
  return "unknown";
}

export const OPEN_ACCEPT = "image/*,application/pdf,.pdf,.json,application/json";

export const baseName = (name) => (name || "Untitled").replace(/\.[^.]+$/, "") || "Untitled";
