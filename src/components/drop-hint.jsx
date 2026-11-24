// Full-window hint shown while files are dragged over the app.
export function DropHint({ advanced }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg pointer-events-none">
      <div className="flex flex-col items-center gap-2 text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-lg font-medium">{advanced ? "Drop to open in the editor" : "Drop files to add pages"}</p>
        <p className="text-sm text-muted-foreground">
          {advanced ? "Images, PDFs, and projects · added as layers when an image is open" : "Images and PDFs supported"}
        </p>
      </div>
    </div>
  );
}
