import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_PDF_PAGES = 100;
export const MAX_UNDO_STATES = 10;

export function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show${isError ? ' error' : ''}`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

export function makeId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function isValidPolygon(points) {
  if (!points || points.length !== 4) return false;
  const intersects = (p1, p2, p3, p4) => {
    const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  };
  if (intersects(points[0], points[1], points[2], points[3])) return false;
  if (intersects(points[1], points[2], points[3], points[0])) return false;
  const area = Math.abs(
    (points[0].x * (points[1].y - points[3].y) +
      points[1].x * (points[2].y - points[0].y) +
      points[2].x * (points[3].y - points[1].y) +
      points[3].x * (points[0].y - points[2].y)) / 2,
  );
  return area >= 100;
}