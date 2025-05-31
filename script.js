const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const bwButton = document.getElementById('bwButton');
const downloadBtn = document.getElementById('downloadPdf');

let isDrawing = false;
let drawingRadius = 10;

// Load image and draw to canvas at full resolution
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  const img = new Image();

  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
  };

  img.src = URL.createObjectURL(file);
});

// Apply simple black & white filter
// bwButton.addEventListener('click', () => {
//   const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//   const data = imgData.data;

//   for (let i = 0; i < data.length; i += 4) {
//     const avg = (data[i] + data[i+1] + data[i+2]) / 3;
//     const val = avg < 128 ? 0 : 255;
//     data[i] = data[i+1] = data[i+2] = val;
//   }

//   ctx.putImageData(imgData, 0, 0);
// });


bwButton.addEventListener('click', () => {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const contrast = 1.7;  // Controls sharpness
  const brightness = -10; // Optional tweak for documents with glare

  for (let i = 0; i < data.length; i += 4) {
    // Get grayscale value
    let gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];

    // Apply contrast
    gray = ((gray - 128) * contrast) + 128;

    // Apply brightness shift
    gray += brightness;

    // Clamp between 0–255
    gray = Math.max(0, Math.min(255, gray));

    data[i] = data[i+1] = data[i+2] = gray;
  }

  ctx.putImageData(imgData, 0, 0);
});


// Eraser tool (white brush)
canvas.addEventListener('mousedown', () => isDrawing = true);
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

// Export canvas to high-res PDF
downloadBtn.addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "l" : "p",
    unit: "px",
    format: [canvas.width, canvas.height]
  });

  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
  pdf.save("scanned.pdf");
});
