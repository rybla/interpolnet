const canvas = document.getElementById('spiroCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const typeSelect = document.getElementById('typeSelect');
const fixedRadiusInput = document.getElementById('fixedRadius');
const movingRadiusInput = document.getElementById('movingRadius');
const penOffsetInput = document.getElementById('penOffset');
const speedInput = document.getElementById('speed');

const fixedRadiusVal = document.getElementById('fixedRadiusVal');
const movingRadiusVal = document.getElementById('movingRadiusVal');
const penOffsetVal = document.getElementById('penOffsetVal');
const speedVal = document.getElementById('speedVal');

const drawBtn = document.getElementById('drawBtn');
const clearBtn = document.getElementById('clearBtn');

// State
let R = parseInt(fixedRadiusInput.value);
let r = parseInt(movingRadiusInput.value);
let d = parseInt(penOffsetInput.value);
let speed = parseInt(speedInput.value);
let type = typeSelect.value; // 'hypotrochoid' or 'epitrochoid'

let theta = 0;
let isDrawing = false;
let animationId;
let centerX, centerY;
let scale = 1;
let prevX, prevY;

function resizeCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, container.clientHeight);
    canvas.width = size;
    canvas.height = size;
    centerX = size / 2;
    centerY = size / 2;

    // Calculate scale to fit the drawing inside the canvas
    const maxRadius = type === 'hypotrochoid'
        ? Math.max(Math.abs(R - r) + d, R)
        : R + r + d;

    scale = (size / 2 - 20) / maxRadius; // 20px padding
    if (scale > 2) scale = 2; // Limit extreme scaling

    clearCanvas();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    theta = 0;
    prevX = undefined;
    prevY = undefined;
    drawFixedCircle();
}

function drawFixedCircle() {
    ctx.beginPath();
    ctx.arc(centerX, centerY, R * scale, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function getPoint(theta) {
    let x, y;

    if (type === 'hypotrochoid') {
        // Hypotrochoid equations
        x = (R - r) * Math.cos(theta) + d * Math.cos(((R - r) / r) * theta);
        y = (R - r) * Math.sin(theta) - d * Math.sin(((R - r) / r) * theta);
    } else {
        // Epitrochoid equations
        x = (R + r) * Math.cos(theta) - d * Math.cos(((R + r) / r) * theta);
        y = (R + r) * Math.sin(theta) - d * Math.sin(((R + r) / r) * theta);
    }

    return {
        x: centerX + x * scale,
        y: centerY + y * scale
    };
}

// Calculate Greatest Common Divisor
function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

// Determine when to stop drawing based on the periods of the circles
function getTargetTheta() {
    // For hypotrochoid: R * revs = r * something
    // We need the least common multiple to complete a full closed loop
    const rAbs = Math.abs(r);
    const RAbs = Math.abs(R);
    if(rAbs === 0) return Math.PI * 2; // prevent div by zero

    const divisor = gcd(RAbs, rAbs);
    const loops = rAbs / divisor;
    return loops * 2 * Math.PI;
}

function draw() {
    if (!isDrawing) return;

    ctx.beginPath();

    // Draw multiple segments per frame based on speed
    const step = 0.05;
    const targetTheta = getTargetTheta();

    for (let i = 0; i < speed; i++) {
        if (theta > targetTheta * 10) { // Safety bound if it doesn't close perfectly due to float
             stopDrawing();
             break;
        }

        const pt = getPoint(theta);

        if (prevX === undefined) {
            ctx.moveTo(pt.x, pt.y);
        } else {
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(pt.x, pt.y);
        }

        prevX = pt.x;
        prevY = pt.y;
        theta += step;
    }

    // Set color with some dynamic hue based on theta
    const hue = (theta * 10) % 360;
    ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (isDrawing) {
        animationId = requestAnimationFrame(draw);
    }
}

function startDrawing() {
    if (isDrawing) {
        cancelAnimationFrame(animationId);
    }
    clearCanvas();
    isDrawing = true;
    drawBtn.textContent = 'Stop Drawing';
    drawBtn.style.backgroundColor = '#ff3377';
    draw();
}

function stopDrawing() {
    isDrawing = false;
    cancelAnimationFrame(animationId);
    drawBtn.textContent = 'Start Drawing';
    drawBtn.style.backgroundColor = '#00ffcc';
}

function updateValues() {
    R = parseInt(fixedRadiusInput.value);
    r = parseInt(movingRadiusInput.value);
    d = parseInt(penOffsetInput.value);
    speed = parseInt(speedInput.value);
    type = typeSelect.value;

    fixedRadiusVal.textContent = R;
    movingRadiusVal.textContent = r;
    penOffsetVal.textContent = d;
    speedVal.textContent = speed;

    resizeCanvas(); // Recalculate scale and clear
}

// Event Listeners
window.addEventListener('resize', resizeCanvas);

fixedRadiusInput.addEventListener('input', () => { updateValues(); stopDrawing(); });
movingRadiusInput.addEventListener('input', () => { updateValues(); stopDrawing(); });
penOffsetInput.addEventListener('input', () => { updateValues(); stopDrawing(); });
speedInput.addEventListener('input', () => { speed = parseInt(speedInput.value); speedVal.textContent = speed; });
typeSelect.addEventListener('change', () => { updateValues(); stopDrawing(); });

drawBtn.addEventListener('click', () => {
    if (isDrawing) {
        stopDrawing();
    } else {
        startDrawing();
    }
});

clearBtn.addEventListener('click', () => {
    stopDrawing();
    clearCanvas();
});

// Initialize
updateValues();
window.dispatchEvent(new Event('resize'));
