const canvas = document.getElementById("spirograph-canvas");
const ctx = canvas.getContext("2d");
const container = document.querySelector(".canvas-container");

const R_slider = document.getElementById("R-slider");
const r_slider = document.getElementById("r-slider");
const d_slider = document.getElementById("d-slider");
const R_val = document.getElementById("R-val");
const r_val = document.getElementById("r-val");
const d_val = document.getElementById("d-val");
const speed_slider = document.getElementById("speed-slider");
const speed_val = document.getElementById("speed-val");
const color_picker = document.getElementById("color-picker");
const type_select = document.getElementById("type-select");
const draw_btn = document.getElementById("draw-btn");
const clear_btn = document.getElementById("clear-btn");

let animationId;
let theta = 0;
let isDrawing = false;
let lastX, lastY;

function resizeCanvas() {
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  clearCanvas();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Calculate the greatest common divisor
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function startDrawing() {
  if (isDrawing) {
    cancelAnimationFrame(animationId);
  }

  clearCanvas();
  theta = 0;
  isDrawing = true;
  lastX = null;
  lastY = null;

  draw();
}

function draw() {
  if (!isDrawing) return;

  const R = parseInt(R_slider.value);
  const r = parseInt(r_slider.value);
  const d = parseInt(d_slider.value);
  const type = type_select.value;
  const speed = parseInt(speed_slider.value);
  const color = color_picker.value;

  // Calculate how many rotations needed to close the curve
  const revs = r / gcd(R, r);
  const maxTheta = revs * 2 * Math.PI;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Draw multiple steps per frame based on speed
  const steps = speed * 10;
  const stepSize = 0.05;

  for (let i = 0; i < steps; i++) {
    if (theta > maxTheta + 0.1) {
      isDrawing = false;
      break;
    }

    let x, y;

    if (type === "hypotrochoid") {
      x = centerX + (R - r) * Math.cos(theta) + d * Math.cos(((R - r) / r) * theta);
      y = centerY + (R - r) * Math.sin(theta) - d * Math.sin(((R - r) / r) * theta);
    } else {
      // epitrochoid
      x = centerX + (R + r) * Math.cos(theta) - d * Math.cos(((R + r) / r) * theta);
      y = centerY + (R + r) * Math.sin(theta) - d * Math.sin(((R + r) / r) * theta);
    }

    if (lastX !== null && lastY !== null) {
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
    }

    lastX = x;
    lastY = y;
    theta += stepSize;
  }

  ctx.stroke();

  if (isDrawing) {
    animationId = requestAnimationFrame(draw);
  }
}

// Event Listeners
window.addEventListener("resize", () => {
  // Add a small delay to ensure container has resized completely
  setTimeout(resizeCanvas, 100);
});

R_slider.addEventListener("input", (e) => {
  R_val.textContent = e.target.value;
});

r_slider.addEventListener("input", (e) => {
  r_val.textContent = e.target.value;
});

d_slider.addEventListener("input", (e) => {
  d_val.textContent = e.target.value;
});

speed_slider.addEventListener("input", (e) => {
  speed_val.textContent = e.target.value;
});

draw_btn.addEventListener("click", startDrawing);

clear_btn.addEventListener("click", () => {
  isDrawing = false;
  cancelAnimationFrame(animationId);
  clearCanvas();
});

// Initial setup
resizeCanvas();
startDrawing();
