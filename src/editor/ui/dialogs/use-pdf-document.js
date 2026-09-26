// Opens a PDF for the import dialog and renders page thumbnails one by one.
import { useEffect, useState } from "react";
import { openPdf } from "../../engine/io/pdf-file.js";

const MAX_THUMBNAILS = 150;

export function usePdfDocument(file) {
  const [pdf, setPdf] = useState(null);
  const [thumbs, setThumbs] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let opened = null;
    (async () => {
      try {
        opened = await openPdf(file);
        if (cancelled) return;
        setPdf(opened);
        for (let n = 1; n <= Math.min(opened.pageCount, MAX_THUMBNAILS) && !cancelled; n++) {
          const canvas = await opened.thumbnail(n, 160);
          if (!cancelled) setThumbs((t) => ({ ...t, [n]: canvas.toDataURL("image/jpeg", 0.8) }));
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "This PDF could not be opened.");
      }
    })();
    return () => {
      cancelled = true;
      opened?.close();
    };
  }, [file]);

  return { pdf, thumbs, error };
}
