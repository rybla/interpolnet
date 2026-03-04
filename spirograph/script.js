const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

// Control elements
const typeSelect = document.getElementById('typeSelect');
const fixedRadiusInput = document.getElementById('fixedRadius');
const movingRadiusInput = document.getElementById('movingRadius');
const penOffsetInput = document.getElementById('penOffset');
const colorPicker = document.getElementById('colorPicker');
const drawBtn = document.getElementById('drawBtn');
const clearBtn = document.getElementById('clearBtn');

// Value display elements
const rVal = document.getElementById('rVal');
const mrVal = document.getElementById('mrVal');
const dVal = document.getElementById('dVal');

// State
let R = parseInt(fixedRadiusInput.value);
let r = parseInt(movingRadiusInput.value);
let d = parseInt(penOffsetInput.value);
let curveType = typeSelect.value;
let color = colorPicker.value;
let isDrawing = false;
let animationFrameId;

// Resize canvas to fit container
function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

window.addEventListener('resize', resizeCanvas);

// Setup initial canvas
function init() {
    resizeCanvas();
    updateDisplays();
    clearCanvas();
}

// Update value displays
function updateDisplays() {
    rVal.textContent = fixedRadiusInput.value;
    mrVal.textContent = movingRadiusInput.value;
    dVal.textContent = penOffsetInput.value;
}

// Event Listeners for controls
fixedRadiusInput.addEventListener('input', () => {
    R = parseInt(fixedRadiusInput.value);
    updateDisplays();
});

movingRadiusInput.addEventListener('input', () => {
    r = parseInt(movingRadiusInput.value);
    updateDisplays();
});

penOffsetInput.addEventListener('input', () => {
    d = parseInt(penOffsetInput.value);
    updateDisplays();
});

typeSelect.addEventListener('change', () => {
    curveType = typeSelect.value;
});

colorPicker.addEventListener('change', () => {
    color = colorPicker.value;
});

clearBtn.addEventListener('click', () => {
    clearCanvas();
});

drawBtn.addEventListener('click', () => {
    if (isDrawing) return;
    drawSpirograph();
});

// Canvas Functions
function clearCanvas() {
    cancelAnimationFrame(animationFrameId);
    isDrawing = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Math functions
function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function calculateMaxT(R, r) {
    // Determine the number of rotations needed to complete the curve
    const greatestCommonDivisor = gcd(R, r);
    return (r / greatestCommonDivisor) * 2 * Math.PI;
}

// Draw the spirograph
function drawSpirograph() {
    isDrawing = true;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    // Calculate total time (t) to draw the complete curve
    const maxT = calculateMaxT(R, r);
    const step = 0.05; // Adjust for smoothness vs performance
    let t = 0;

    // Calculate initial position
    let startX, startY;
    if (curveType === 'hypotrochoid') {
        startX = centerX + (R - r) * Math.cos(0) + d * Math.cos(((R - r) / r) * 0);
        startY = centerY + (R - r) * Math.sin(0) - d * Math.sin(((R - r) / r) * 0);
    } else { // epitrochoid
        startX = centerX + (R + r) * Math.cos(0) - d * Math.cos(((R + r) / r) * 0);
        startY = centerY + (R + r) * Math.sin(0) - d * Math.sin(((R + r) / r) * 0);
    }

    ctx.moveTo(startX, startY);

    function animateDraw() {
        if (!isDrawing) return;

        // Draw a chunk of the curve per frame to speed up animation
        const stepsPerFrame = 50;

        for (let i = 0; i < stepsPerFrame; i++) {
            if (t > maxT) {
                isDrawing = false;
                ctx.stroke();
                return;
            }

            let x, y;
            if (curveType === 'hypotrochoid') {
                x = centerX + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
                y = centerY + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
            } else { // epitrochoid
                x = centerX + (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t);
                y = centerY + (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t);
            }

            ctx.lineTo(x, y);
            t += step;
        }

        ctx.stroke();
        animationFrameId = requestAnimationFrame(animateDraw);
    }

    animateDraw();
}

// Initialize on load
init();
