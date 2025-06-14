// Set the worker source for PDF.js to a local file.
// This is the most reliable method for deploying on services like GitHub Pages.
pdfjsLib.GlobalWorkerOptions.workerSrc = './libs/pdf.worker.min.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const bwButton = document.getElementById('bwButton');
const downloadBtn = document.getElementById('downloadPdf');
const perspectiveCropBtn = document.getElementById('perspectiveCropButton');

// PDF-related elements
const pdfControls = document.getElementById('pdf-controls');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');

// Modal elements
const alertModal = document.getElementById('alert-modal');
const alertModalText = document.getElementById('alert-modal-text');
const alertModalClose = document.getElementById('alert-modal-close');

let isDrawing = false;
let drawingRadius = 10;

// PDF.js state
let pdfDoc = null;
let currentPageNum = 1;
let pageRendering = false;
let pageNumPending = null;
const pdfScale = 1.5;

// --- Custom Alert Function ---
function showAlert(message) {
    alertModalText.textContent = message;
    alertModal.style.display = 'flex';
}

alertModalClose.addEventListener('click', () => {
    alertModal.style.display = 'none';
});

/**
 * Main event listener for the file input.
 */
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    pdfControls.style.display = 'none';
    perspectiveCropBtn.style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (file.type === "application/pdf") {
        handlePdfFile(file);
    } else if (file.type.startsWith("image/")) {
        handleImageFile(file);
    } else {
        showAlert('Unsupported file type. Please upload an image or a PDF.');
    }
});

/**
 * Handles image file loading.
 */
function handleImageFile(file) {
    try {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            perspectiveCropBtn.style.display = 'inline-block';
        };
        img.onerror = () => showAlert("Could not load the selected image file.");
        img.src = URL.createObjectURL(file);
    } catch (error) {
        console.error("Error handling image:", error);
        showAlert("An error occurred while loading the image.");
    }
}

/**
 * Handles PDF file loading.
 */
function handlePdfFile(file) {
    const fileReader = new FileReader();
    fileReader.onload = function() {
        try {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(pdfDoc_ => {
                pdfDoc = pdfDoc_;
                pageCountSpan.textContent = pdfDoc.numPages;
                currentPageNum = 1;
                renderPage(currentPageNum);
                pdfControls.style.display = 'flex';
                perspectiveCropBtn.style.display = 'inline-block';
            }).catch(error => {
                console.error("Error parsing PDF:", error);
                showAlert("Could not parse the PDF file. It might be corrupted or password-protected.");
            });
        } catch (error) {
            console.error("Error reading PDF file:", error);
            showAlert("An error occurred while reading the PDF file.");
        }
    };
    fileReader.onerror = () => showAlert("Failed to read the selected file.");
    fileReader.readAsArrayBuffer(file);
}

/**
 * Renders a specific PDF page.
 */
function renderPage(num) {
    pageRendering = true;
    pageNumSpan.textContent = num;
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: pdfScale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const renderContext = { canvasContext: ctx, viewport: viewport };
        page.render(renderContext).promise.then(() => {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        }).catch(error => {
             console.error('Error rendering page:', error);
             pageRendering = false;
        });
    });
}

function queueRenderPage(num) {
    pageRendering ? (pageNumPending = num) : renderPage(num);
}

prevPageBtn.addEventListener('click', () => {
    if (currentPageNum <= 1) return;
    currentPageNum--;
    queueRenderPage(currentPageNum);
});

nextPageBtn.addEventListener('click', () => {
    if (currentPageNum >= pdfDoc.numPages) return;
    currentPageNum++;
    queueRenderPage(currentPageNum);
});


/**
 * Applies the "Black & White" filter.
 */
bwButton.addEventListener('click', () => {
  if (!canvas.width || !canvas.height) {
      showAlert("Please load an image or PDF first.");
      return;
  }
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const contrast = 1.7;
  const brightness = -10;

  for (let i = 0; i < data.length; i += 4) {
    let gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    gray = ((gray - 128) * contrast) + 128 + brightness;
    gray = Math.max(0, Math.min(255, gray));
    data[i] = data[i+1] = data[i+2] = gray;
  }

  ctx.putImageData(imgData, 0, 0);
});

// --- Eraser Tool ---
canvas.addEventListener('mousedown', (e) => {
    if(e.buttons === 1) isDrawing = true;
});
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x, y, drawingRadius, 0, Math.PI * 2);
  ctx.fill();
});

// --- PDF Download ---
downloadBtn.addEventListener('click', async () => {
  if (!canvas.width || !canvas.height) {
      showAlert("Please load an image or PDF first.");
      return;
  }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "l" : "p",
    unit: "px",
    format: [canvas.width, canvas.height]
  });

  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
  pdf.save("scanned-document.pdf");
});
