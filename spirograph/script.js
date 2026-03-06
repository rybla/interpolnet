const canvas = document.getElementById('spirograph-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const rInput = document.getElementById('fixed-radius');
const rSmallInput = document.getElementById('moving-radius');
const dInput = document.getElementById('pen-offset');
const speedInput = document.getElementById('drawing-speed');
const colorInput = document.getElementById('color');
const btnDraw = document.getElementById('btn-draw');
const btnClear = document.getElementById('btn-clear');
const btnHypo = document.getElementById('type-hypo');
const btnEpi = document.getElementById('type-epi');

const rVal = document.getElementById('r-val');
const rSmallVal = document.getElementById('r-small-val');
const dVal = document.getElementById('d-val');
const speedVal = document.getElementById('speed-val');

// State
let R = parseInt(rInput.value);
let r = parseInt(rSmallInput.value);
let d = parseInt(dInput.value);
let speed = parseInt(speedInput.value);
let penColor = colorInput.value;
let isHypotrochoid = true; // false means Epitrochoid

let animationId = null;
let theta = 0;
let lastX = null;
let lastY = null;

// Initialize Canvas Size
function resizeCanvas() {
  const container = canvas.parentElement;
  const size = Math.min(container.clientWidth, container.clientHeight) * 0.95;
  canvas.width = size;
  canvas.height = size;

  if (animationId === null) {
      drawPreview();
  }
}

window.addEventListener('resize', resizeCanvas);

// Update value displays
function updateDisplays() {
  rVal.textContent = rInput.value;
  rSmallVal.textContent = rSmallInput.value;
  dVal.textContent = dInput.value;
  speedVal.textContent = speedInput.value;
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function clearCanvas() {
  stopAnimation();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  theta = 0;
  lastX = null;
  lastY = null;
  drawPreview();
}

// Calculate Greatest Common Divisor
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// Draw static preview of the underlying circles
function drawPreview() {
    stopAnimation();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    R = parseInt(rInput.value);
    r = parseInt(rSmallInput.value);
    d = parseInt(dInput.value);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Scale down if it exceeds bounds (optional, but good for large R)
    const maxRadius = Math.max(R, R + r + d, Math.abs(R - r) + d);
    let scale = 1;
    if (maxRadius > canvas.width / 2.2) {
        scale = (canvas.width / 2.2) / maxRadius;
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Fixed Circle
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#555';
    ctx.setLineDash([5, 5]);
    ctx.stroke();

    // Moving Circle at angle 0
    let cx, cy;
    if (isHypotrochoid) {
        cx = R - r;
        cy = 0;
    } else {
        cx = R + r;
        cy = 0;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#888';
    ctx.setLineDash([2, 4]);
    ctx.stroke();

    // Line from moving circle center to pen
    ctx.beginPath();
    ctx.moveTo(cx, cy);

    let px, py;
    if (isHypotrochoid) {
         px = (R - r) * Math.cos(0) + d * Math.cos(((R - r) / r) * 0);
         py = (R - r) * Math.sin(0) - d * Math.sin(((R - r) / r) * 0);
    } else {
         px = (R + r) * Math.cos(0) - d * Math.cos(((R + r) / r) * 0);
         py = (R + r) * Math.sin(0) - d * Math.sin(((R + r) / r) * 0);
    }

    ctx.lineTo(px, py);
    ctx.strokeStyle = '#aaa';
    ctx.setLineDash([]);
    ctx.stroke();

    // Pen dot
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = penColor;
    ctx.fill();

    ctx.restore();
}

function startDrawing() {
  stopAnimation();

  R = parseInt(rInput.value);
  r = parseInt(rSmallInput.value);
  d = parseInt(dInput.value);
  speed = parseInt(speedInput.value);
  penColor = colorInput.value;

  theta = 0;
  lastX = null;
  lastY = null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // To ensure the path closes, theta needs to go up to maxTheta
  const reducedR = R / gcd(R, r);
  const reducedR_small = r / gcd(R, r);
  // How many rotations of the inner/outer circle around the fixed one
  const rotations = reducedR_small;
  const maxTheta = rotations * Math.PI * 2;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const maxRadius = Math.max(R, R + r + d, Math.abs(R - r) + d);
  let scale = 1;
  if (maxRadius > canvas.width / 2.2) {
      scale = (canvas.width / 2.2) / maxRadius;
  }

  function drawFrame() {
    if (theta >= maxTheta) {
        stopAnimation();
        return; // Finished
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 1 / scale; // Keep line width visually consistent
    ctx.lineJoin = 'round';

    if (lastX !== null && lastY !== null) {
      ctx.moveTo(lastX, lastY);
    }

    // Step size based on speed. Larger speed = larger jumps per frame
    // We do multiple small steps per frame to keep the curve smooth at high speeds
    const stepsPerFrame = speed * 2;
    const stepSize = 0.05;

    for (let i = 0; i < stepsPerFrame; i++) {
        if (theta >= maxTheta) break;

        let x, y;
        if (isHypotrochoid) {
            x = (R - r) * Math.cos(theta) + d * Math.cos(((R - r) / r) * theta);
            y = (R - r) * Math.sin(theta) - d * Math.sin(((R - r) / r) * theta);
        } else {
            x = (R + r) * Math.cos(theta) - d * Math.cos(((R + r) / r) * theta);
            y = (R + r) * Math.sin(theta) - d * Math.sin(((R + r) / r) * theta);
        }

        if (lastX === null) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        lastX = x;
        lastY = y;
        theta += stepSize;
    }

    ctx.stroke();
    ctx.restore();

    animationId = requestAnimationFrame(drawFrame);
  }

  drawFrame();
}

// Event Listeners
const inputs = [rInput, rSmallInput, dInput, speedInput, colorInput];
inputs.forEach(input => {
    input.addEventListener('input', () => {
        updateDisplays();
        penColor = colorInput.value; // Update immediately
        if (animationId === null && theta === 0) {
            drawPreview();
        }
    });
});

btnHypo.addEventListener('click', () => {
    isHypotrochoid = true;
    btnHypo.classList.add('active');
    btnEpi.classList.remove('active');
    if (animationId === null && theta === 0) {
        drawPreview();
    }
});

btnEpi.addEventListener('click', () => {
    isHypotrochoid = false;
    btnEpi.classList.add('active');
    btnHypo.classList.remove('active');
    if (animationId === null && theta === 0) {
        drawPreview();
    }
});

btnDraw.addEventListener('click', startDrawing);
btnClear.addEventListener('click', clearCanvas);

// Init
resizeCanvas();
updateDisplays();
drawPreview();
