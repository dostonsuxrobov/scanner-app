import { useState, useEffect, useRef } from 'react';

const acceptsImagesAndPdfs = (f) => f.type.startsWith('image/') || f.type === 'application/pdf';

// Tracks files dragged over the window and hands accepted ones to
// `onFilesDropped`. Returns whether a file drag is in progress.
export function useDropZone(onFilesDropped, accept = acceptsImagesAndPdfs) {
  const [isDragging, setIsDragging] = useState(false);
  // dragenter/dragleave fire for every element crossed; the drag has left the
  // window when the two balance out.
  const depth = useRef(0);
  const latest = useRef({ onFilesDropped, accept });
  latest.current = { onFilesDropped, accept };

  useEffect(() => {
    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const enter = (e) => {
      stop(e);
      depth.current++;
      if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
    };
    const leave = (e) => {
      stop(e);
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setIsDragging(false);
    };
    const drop = (e) => {
      stop(e);
      depth.current = 0;
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter(latest.current.accept);
      if (files.length > 0) latest.current.onFilesDropped(files);
    };
    const d = document.documentElement;
    d.addEventListener('dragenter', enter);
    d.addEventListener('dragleave', leave);
    d.addEventListener('dragover', stop);
    d.addEventListener('drop', drop);
    return () => {
      d.removeEventListener('dragenter', enter);
      d.removeEventListener('dragleave', leave);
      d.removeEventListener('dragover', stop);
      d.removeEventListener('drop', drop);
    };
  }, []);

  return isDragging;
}
