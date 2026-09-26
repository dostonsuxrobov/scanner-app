import { useState, useEffect, useCallback } from 'react';

const acceptsImagesAndPdfs = (f) => f.type.startsWith('image/') || f.type === 'application/pdf';

export function useDropZone(onFilesDropped, accept = acceptsImagesAndPdfs) {
  const [isDragging, setIsDragging] = useState(false);
  let dragCounter = 0;

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(accept);

    if (files.length > 0) onFilesDropped(files);
  }, [onFilesDropped, accept]);

  useEffect(() => {
    const d = document.documentElement;
    d.addEventListener('dragenter', handleDragEnter);
    d.addEventListener('dragleave', handleDragLeave);
    d.addEventListener('dragover', handleDragOver);
    d.addEventListener('drop', handleDrop);
    return () => {
      d.removeEventListener('dragenter', handleDragEnter);
      d.removeEventListener('dragleave', handleDragLeave);
      d.removeEventListener('dragover', handleDragOver);
      d.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return isDragging;
}
