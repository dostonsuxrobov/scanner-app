// Simple perspective crop functionality
let perspectiveActive = false;
let corners = [];
let cornerHandles = [];
let originalImageData = null;

// Wait for DOM to load and scripts to initialize
window.addEventListener('load', () => {
  const imageInput = document.getElementById('imageInput');
  const perspectiveBtn = document.getElementById('perspectiveCropButton');
  
  // Show perspective crop button when image is loaded
  const originalInputHandler = imageInput.onchange;
  imageInput.addEventListener('change', (e) => {
    // Call original handler if exists
    if (originalInputHandler) originalInputHandler.call(imageInput, e);
    
    // Show crop button after a delay to ensure image is loaded
    setTimeout(() => {
      perspectiveBtn.style.display = 'inline-block';
      perspectiveActive = false;
      corners = [];
      removeCornerHandles();
    }, 500);
  });
  
  // Initialize perspective cropping
  perspectiveBtn.addEventListener('click', () => {
    if (perspectiveActive) {
      applyPerspectiveCrop();
    } else {
      initializePerspectiveCrop();
    }
  });
  
  // Keyboard shortcuts for applying crop
  document.addEventListener('keydown', (e) => {
    if (perspectiveActive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      applyPerspectiveCrop();
    }
  });
});

function initializePerspectiveCrop() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  
  perspectiveActive = true;
  document.getElementById('perspectiveCropButton').textContent = 'Apply Crop (Enter/Space)';
  
  // Store original image
  originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Initialize corners at 20% margin from edges
  const margin = 0.2;
  corners = [
    { x: canvas.width * margin, y: canvas.height * margin },
    { x: canvas.width * (1 - margin), y: canvas.height * margin },
    { x: canvas.width * (1 - margin), y: canvas.height * (1 - margin) },
    { x: canvas.width * margin, y: canvas.height * (1 - margin) }
  ];
  
  createCornerHandles();
  drawPerspectiveGuides();
}

function createCornerHandles() {
  const canvas = document.getElementById('canvas');
  
  corners.forEach((corner, index) => {
    const handle = document.createElement('div');
    handle.style.cssText = `
      position: absolute;
      width: 24px;
      height: 24px;
      background: #007bff;
      border: 3px solid white;
      border-radius: 50%;
      cursor: move;
      transform: translate(-50%, -50%);
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    
    updateHandlePosition(handle, corner);
    
    // Make draggable
    let isDragging = false;
    
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        corner.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        corner.y = (e.clientY - rect.top) * (canvas.height / rect.height);
        updateHandlePosition(handle, corner);
        drawPerspectiveGuides();
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    // Touch support
    handle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDragging = true;
    });
    
    document.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        corner.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        corner.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        updateHandlePosition(handle, corner);
        drawPerspectiveGuides();
      }
    });
    
    document.addEventListener('touchend', () => {
      isDragging = false;
    });
    
    document.body.appendChild(handle);
    cornerHandles.push(handle);
  });
}

function updateHandlePosition(handle, corner) {
  const canvas = document.getElementById('canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  handle.style.left = (rect.left + corner.x * scaleX) + 'px';
  handle.style.top = (rect.top + corner.y * scaleY) + 'px';
}

function drawPerspectiveGuides() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  
  // Restore original image
  ctx.putImageData(originalImageData, 0, 0);
  
  // Draw semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Clear the selected area
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  
  // Draw the original image in the selected area
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.clip();
  ctx.putImageData(originalImageData, 0, 0);
  ctx.restore();
  
  // Draw border lines
  ctx.strokeStyle = '#007bff';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

function removeCornerHandles() {
  cornerHandles.forEach(handle => handle.remove());
  cornerHandles = [];
}

function applyPerspectiveCrop() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  
  // Find bounding box
  const minX = Math.min(...corners.map(c => c.x));
  const maxX = Math.max(...corners.map(c => c.x));
  const minY = Math.min(...corners.map(c => c.y));
  const maxY = Math.max(...corners.map(c => c.y));
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Create temporary canvas for cropped image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  
  // Put back original image first
  ctx.putImageData(originalImageData, 0, 0);
  
  // Simple crop
  tempCtx.drawImage(
    canvas,
    minX, minY, width, height,
    0, 0, width, height
  );
  
  // Update main canvas
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(tempCanvas, 0, 0);
  
  // Cleanup
  removeCornerHandles();
  perspectiveActive = false;
  document.getElementById('perspectiveCropButton').textContent = 'Perspective Crop';
  corners = [];
  originalImageData = null;
}

// Update handle positions when window resizes
window.addEventListener('resize', () => {
  if (perspectiveActive) {
    cornerHandles.forEach((handle, index) => {
      updateHandlePosition(handle, corners[index]);
    });
  }
});