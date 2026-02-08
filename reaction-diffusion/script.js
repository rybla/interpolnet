const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

// Simulation parameters
const width = 200;
const height = 200;
canvas.width = width;
canvas.height = height;

// Simulation state
let gridA = new Float32Array(width * height);
let gridB = new Float32Array(width * height);
let nextA = new Float32Array(width * height);
let nextB = new Float32Array(width * height);

// Constants
const Da = 1.0;
const Db = 0.5;
let feed = 0.055;
let kill = 0.062;
const dt = 1.0;

// UI Elements
const feedInput = document.getElementById('feed-rate');
const killInput = document.getElementById('kill-rate');
const feedDisplay = document.getElementById('feed-display');
const killDisplay = document.getElementById('kill-display');
const speedInput = document.getElementById('speed-control');
const speedDisplay = document.getElementById('speed-display');
const presetSelect = document.getElementById('preset-select');
const resetBtn = document.getElementById('reset-btn');
const clearBtn = document.getElementById('clear-btn');

let iterationsPerFrame = 10;

// Initialization
function init() {
    for (let i = 0; i < width * height; i++) {
        gridA[i] = 1.0;
        gridB[i] = 0.0;
    }

    // Seed a small area with B
    seedArea(width / 2, height / 2, 20);
}

function seedArea(x, y, r) {
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            let dx = i - x;
            let dy = j - y;
            if (dx*dx + dy*dy < r*r) {
                let idx = i + j * width;
                if (idx >= 0 && idx < width * height) {
                    gridB[idx] = 1.0;
                }
            }
        }
    }
}

function update() {
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let i = x + y * width;

            let a = gridA[i];
            let b = gridB[i];

            // Laplacian
            // Center weight -1, adjacent 0.2, diagonal 0.05
            // Using a simple convolution kernel
            //  0.05 0.20 0.05
            //  0.20 -1.0 0.20
            //  0.05 0.20 0.05

            let lapA =
                (gridA[i-1] + gridA[i+1] + gridA[i-width] + gridA[i+width]) * 0.2 +
                (gridA[i-width-1] + gridA[i-width+1] + gridA[i+width-1] + gridA[i+width+1]) * 0.05 -
                a;

            let lapB =
                (gridB[i-1] + gridB[i+1] + gridB[i-width] + gridB[i+width]) * 0.2 +
                (gridB[i-width-1] + gridB[i-width+1] + gridB[i+width-1] + gridB[i+width+1]) * 0.05 -
                b;

            // Reaction-Diffusion formula
            let abb = a * b * b;

            let na = a + (Da * lapA - abb + feed * (1 - a)) * dt;
            let nb = b + (Db * lapB + abb - (kill + feed) * b) * dt;

            // Clamp values
            if (na < 0) na = 0;
            if (na > 1) na = 1;
            if (nb < 0) nb = 0;
            if (nb > 1) nb = 1;

            nextA[i] = na;
            nextB[i] = nb;
        }
    }

    // Swap buffers
    let tempA = gridA;
    gridA = nextA;
    nextA = tempA;

    let tempB = gridB;
    gridB = nextB;
    nextB = tempB;
}

function draw() {
    let imgData = ctx.getImageData(0, 0, width, height);
    let data = imgData.data;

    for (let i = 0; i < width * height; i++) {
        let a = gridA[i];
        let b = gridB[i];

        let smoothT = Math.max(0, Math.min(1, a - b));

        // Coloring logic
        // Background (smoothT = 1, A=1, B=0) -> Black/Dark
        // Active (smoothT = 0, A=low, B=high) -> Bright

        let colorFactor = 1.0 - smoothT;

        // A nice cyan/teal to white gradient
        // R: increases at end
        // G: increases linearly
        // B: increases faster

        let r = Math.floor(Math.pow(colorFactor, 3) * 255);
        let g = Math.floor(colorFactor * 255);
        let bb = Math.floor(Math.pow(colorFactor, 0.5) * 255);

        let pixelIdx = i * 4;
        data[pixelIdx] = r;
        data[pixelIdx+1] = g;
        data[pixelIdx+2] = bb;
        data[pixelIdx+3] = 255; // Alpha
    }

    ctx.putImageData(imgData, 0, 0);
}

function loop() {
    for (let i = 0; i < iterationsPerFrame; i++) {
        update();
    }
    draw();
    requestAnimationFrame(loop);
}

// Interaction
let isDragging = false;

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    addChemicals(e);
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        addChemicals(e);
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    isDragging = true;
    e.preventDefault(); // Prevent scrolling
    addChemicals(e.touches[0]);
});

canvas.addEventListener('touchmove', (e) => {
    if (isDragging) {
        e.preventDefault();
        addChemicals(e.touches[0]);
    }
});

canvas.addEventListener('touchend', () => {
    isDragging = false;
});

function addChemicals(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    seedArea(x, y, 5);
}

// Controls
feedInput.addEventListener('input', (e) => {
    feed = parseFloat(e.target.value);
    feedDisplay.textContent = feed.toFixed(4);
    presetSelect.value = "custom";
});

killInput.addEventListener('input', (e) => {
    kill = parseFloat(e.target.value);
    killDisplay.textContent = kill.toFixed(4);
    presetSelect.value = "custom";
});

speedInput.addEventListener('input', (e) => {
    iterationsPerFrame = parseInt(e.target.value);
    speedDisplay.textContent = iterationsPerFrame + "x";
});

resetBtn.addEventListener('click', () => {
    init();
});

clearBtn.addEventListener('click', () => {
    for (let i = 0; i < width * height; i++) {
        gridA[i] = 1.0;
        gridB[i] = 0.0;
        nextA[i] = 1.0;
        nextB[i] = 0.0;
    }
});

const presets = {
    "default": { f: 0.055, k: 0.062 },
    "soliton": { f: 0.03, k: 0.062 },
    "worms": { f: 0.058, k: 0.065 },
    "mazes": { f: 0.029, k: 0.057 },
    "holes": { f: 0.039, k: 0.058 },
    "chaos": { f: 0.026, k: 0.051 },
    "moving-spots": { f: 0.014, k: 0.047 }
};

presetSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (presets[val]) {
        feed = presets[val].f;
        kill = presets[val].k;

        feedInput.value = feed;
        killInput.value = kill;

        feedDisplay.textContent = feed.toFixed(4);
        killDisplay.textContent = kill.toFixed(4);

        // Optional: restart simulation on preset change?
        // Maybe just let it morph, it's cool to watch it transition
    }
});

// Start
init();
loop();
