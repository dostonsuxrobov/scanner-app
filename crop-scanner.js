// Simple perspective crop functionality
let perspectiveActive = false;
let corners = [];
let cornerHandles = [];
let originalImageData = null;

// Wait for DOM to load and scripts to initialize
window.addEventListener('load', () => {
  const imageInput = document.getElementById('imageInput');
  const perspectiveBtn = document.getElementById('perspectiveCropButton');
  
  const originalInputHandler = imageInput.onchange;
  imageInput.addEventListener('change', (e) => {
    if (originalInputHandler) originalInputHandler.call(imageInput, e);
    setTimeout(() => {
      perspectiveBtn.style.display = 'inline-block';
      if (perspectiveActive) {
          // If a crop was active, cancel it when a new image is loaded
          removeCornerHandles();
          perspectiveActive = false;
          document.getElementById('perspectiveCropButton').textContent = 'Perspective Crop';
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          if (originalImageData) {
            ctx.putImageData(originalImageData, 0, 0);
          }
      }
      corners = [];
      
    }, 500);
  });
  
  perspectiveBtn.addEventListener('click', () => {
    if (perspectiveActive) {
      applyPerspectiveCrop();
    } else {
      initializePerspectiveCrop();
    }
  });
  
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
  
  originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
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
  // Use the new container as the parent for the handles
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
      console.error("Canvas container not found!");
      return;
  }

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
    
    let isDragging = false;
    
    const onDragStart = (e) => {
      e.preventDefault();
      isDragging = true;
    };

    const onDragMove = (e) => {
        if (isDragging) {
            e.preventDefault();
            const canvas = document.getElementById('canvas');
            const rect = canvasContainer.getBoundingClientRect(); // Use container's rect
            
            // Determine clientX/Y from either mouse or touch event
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            // Calculate position relative to the container
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            // Convert container-relative position to canvas-native coordinates
            corner.x = (x / rect.width) * canvas.width;
            corner.y = (y / rect.height) * canvas.height;
            
            // Clamp coordinates to stay within canvas bounds
            corner.x = Math.max(0, Math.min(canvas.width, corner.x));
            corner.y = Math.max(0, Math.min(canvas.height, corner.y));

            updateHandlePosition(handle, corner);
            drawPerspectiveGuides();
        }
    };

    const onDragEnd = () => {
      isDragging = false;
    };
    
    handle.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    
    handle.addEventListener('touchstart', onDragStart);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
    
    // Append handle to the container, not the body
    canvasContainer.appendChild(handle);
    cornerHandles.push(handle);
  });
}

function updateHandlePosition(handle, corner) {
  const canvas = document.getElementById('canvas');
  // Position the handle relative to the container using percentages
  handle.style.left = `${(corner.x / canvas.width) * 100}%`;
  handle.style.top = `${(corner.y / canvas.height) * 100}%`;
}


function drawPerspectiveGuides() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  
  ctx.putImageData(originalImageData, 0, 0);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
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
  // NOTE: This is a simplified crop. True perspective warp is more complex.
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  
  const minX = Math.min(corners[0].x, corners[1].x, corners[2].x, corners[3].x);
  const maxX = Math.max(corners[0].x, corners[1].x, corners[2].x, corners[3].x);
  const minY = Math.min(corners[0].y, corners[1].y, corners[2].y, corners[3].y);
  const maxY = Math.max(corners[0].y, corners[1].y, corners[2].y, corners[3].y);
  
  const width = maxX - minX;
  const height = maxY - minY;

  if (width <= 0 || height <= 0) {
      removeAndCleanup();
      return;
  }
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  
  ctx.putImageData(originalImageData, 0, 0);
  
  tempCtx.drawImage(
    canvas,
    minX, minY, width, height,
    0, 0, width, height
  );
  
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(tempCanvas, 0, 0);
  
  removeAndCleanup();
}

function removeAndCleanup() {
    removeCornerHandles();
    perspectiveActive = false;
    document.getElementById('perspectiveCropButton').textContent = 'Perspective Crop';
    corners = [];
    originalImageData = null;
}

// Update handle positions if window resizes, as container size might change
window.addEventListener('resize', () => {
  if (perspectiveActive) {
    cornerHandles.forEach((handle, index) => {
      updateHandlePosition(handle, corners[index]);
    });
  }
});
