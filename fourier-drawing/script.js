const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const drawBtn = document.getElementById('draw-btn');
const animateBtn = document.getElementById('animate-btn');
const clearBtn = document.getElementById('clear-btn');
const slider = document.getElementById('epicycles-slider');
const countSpan = document.getElementById('epicycles-count');
const instructions = document.querySelector('.instructions');

let state = 'DRAWING'; // DRAWING, ANIMATING
let drawingPath = [];
let fourierX = [];
let time = 0;
let pathTrace = [];
let isDrawing = false;
let animationId = null;

// Set canvas size
function resizeCanvas() {
    const containerWidth = Math.min(window.innerWidth - 40, 800);
    const size = Math.min(containerWidth, 600);
    canvas.width = size;
    canvas.height = size * 0.75;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Helper: DFT
// x is array of complex numbers {re, im}
function dft(x) {
    const X = [];
    const N = x.length;
    for (let k = 0; k < N; k++) {
        let re = 0;
        let im = 0;
        for (let n = 0; n < N; n++) {
            const phi = (2 * Math.PI * k * n) / N;
            re += x[n].re * Math.cos(phi) + x[n].im * Math.sin(phi);
            im += x[n].im * Math.cos(phi) - x[n].re * Math.sin(phi);
        }
        re = re / N;
        im = im / N;

        let freq = k;
        let amp = Math.sqrt(re * re + im * im);
        let phase = Math.atan2(im, re);
        X[k] = { re, im, freq, amp, phase };
    }
    return X;
}

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    // Handle both mouse and touch events
    const x = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
    const y = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
    return {
        x: (x - rect.left) * (canvas.width / rect.width),
        y: (y - rect.top) * (canvas.height / rect.height)
    };
}

function startDrawing(e) {
    if (state !== 'DRAWING') return;
    if (e.type === 'touchstart') e.preventDefault();

    isDrawing = true;
    drawingPath = [];
    pathTrace = [];
    time = 0;

    // Reset Fourier data
    fourierX = [];
    slider.disabled = true;
    animateBtn.disabled = true;

    const pos = getPos(e);
    drawingPath.push({ re: pos.x, im: pos.y });

    // Stop any existing animation
    if (animationId) cancelAnimationFrame(animationId);

    renderDrawing();
}

function draw(e) {
    if (!isDrawing || state !== 'DRAWING') return;
    if (e.type === 'touchmove') e.preventDefault();

    const pos = getPos(e);
    drawingPath.push({ re: pos.x, im: pos.y });

    renderDrawing();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    renderDrawing();

    if (drawingPath.length > 5) {
        animateBtn.disabled = false;
        instructions.innerText = 'Click "Animate" to calculate Fourier Series.';
    }
}

// Event Listeners
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
window.addEventListener('touchend', stopDrawing);

function renderDrawing() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw user path
    if (drawingPath.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.moveTo(drawingPath[0].re, drawingPath[0].im);
        for (let i = 1; i < drawingPath.length; i++) {
            ctx.lineTo(drawingPath[i].re, drawingPath[i].im);
        }
        ctx.stroke();
    }
}

drawBtn.addEventListener('click', () => {
    state = 'DRAWING';
    drawBtn.classList.add('active');
    animateBtn.classList.remove('active');
    if (animationId) cancelAnimationFrame(animationId);
    renderDrawing();
    instructions.innerText = 'Click "Draw" and trace a continuous loop on the canvas.';
});

animateBtn.addEventListener('click', () => {
    if (drawingPath.length < 5) return;

    state = 'ANIMATING';
    animateBtn.classList.add('active');
    drawBtn.classList.remove('active');
    slider.disabled = false;

    // Compute DFT
    // Skip some points if too many to keep it responsive, but
    // for <2000 points JS is fast enough.
    // Let's just limit the max points fed to DFT to ~300 to keep it very smooth and "low-fi" looking initially.
    // Actually, user wants "accuracy", so let's try to keep most.
    // But too many points slows down the O(N^2) DFT significantly.
    // 500 points -> 250,000 ops. Fast.
    // 1000 points -> 1,000,000 ops. Fast.
    // 2000 points -> 4M ops. Ok.

    const maxPoints = 512;
    let input = [];

    if (drawingPath.length > maxPoints) {
        const step = drawingPath.length / maxPoints;
        for(let i=0; i<maxPoints; i++) {
            input.push(drawingPath[Math.floor(i * step)]);
        }
    } else {
        input = drawingPath;
    }

    fourierX = dft(input);
    fourierX.sort((a, b) => b.amp - a.amp);

    slider.max = fourierX.length;
    slider.value = fourierX.length; // Default to full accuracy
    countSpan.innerText = slider.value;

    time = 0;
    pathTrace = [];
    instructions.innerText = 'Adjust the "Epicycles" slider to change accuracy.';

    animate();
});

clearBtn.addEventListener('click', () => {
    state = 'DRAWING';
    drawingPath = [];
    pathTrace = [];
    fourierX = [];
    isDrawing = false;

    drawBtn.classList.add('active');
    animateBtn.classList.remove('active');
    animateBtn.disabled = true;
    slider.disabled = true;
    countSpan.innerText = '0';
    instructions.innerText = 'Click "Draw" and trace a continuous loop on the canvas.';

    if (animationId) cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

slider.addEventListener('input', () => {
    countSpan.innerText = slider.value;
    // Clear trace when changing params to avoid weird artifacts?
    // Or just let it converge. Let's clear trace.
    pathTrace = [];
});

function animate() {
    if (state !== 'ANIMATING') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw original path faintly
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    if (drawingPath.length > 0) {
        ctx.moveTo(drawingPath[0].re, drawingPath[0].im);
        for (let i = 1; i < drawingPath.length; i++) {
            ctx.lineTo(drawingPath[i].re, drawingPath[i].im);
        }
    }
    ctx.stroke();

    const N = parseInt(slider.value);

    let vx = 0;
    let vy = 0;

    // We start from the center (or wherever the DC offset puts us)
    // The DFT calculates absolute coordinates components.
    // X[0] is the DC offset (average position).
    // Note: Since we sorted by amplitude, X[0] is likely the DC component because it's usually large,
    // unless the shape is centered at origin. But here coordinates are positive (canvas space).

    for (let i = 0; i < N; i++) {
        let prevx = vx;
        let prevy = vy;

        let freq = fourierX[i].freq;
        let radius = fourierX[i].amp;
        let phase = fourierX[i].phase;

        vx += radius * Math.cos(freq * time + phase);
        vy += radius * Math.sin(freq * time + phase);

        // Draw circle
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.arc(prevx, prevy, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.moveTo(prevx, prevy);
        ctx.lineTo(vx, vy);
        ctx.stroke();
    }

    pathTrace.unshift({ x: vx, y: vy });

    // Draw trace
    ctx.beginPath();
    ctx.strokeStyle = '#00bcd4';
    ctx.lineWidth = 2;
    if (pathTrace.length > 0) {
        ctx.moveTo(pathTrace[0].x, pathTrace[0].y);
        for (let i = 1; i < pathTrace.length; i++) {
            ctx.lineTo(pathTrace[i].x, pathTrace[i].y);
        }
    }
    ctx.stroke();

    // Calculate dt based on the FULL period (2PI) and the number of samples in the DFT
    // The DFT assumes the signal repeats every N samples.
    // So one period is 2PI.
    // We want to traverse the period in the same number of frames as the original points?
    // Or just at a constant speed.
    // Let's just do it constant speed.
    const dt = (2 * Math.PI) / fourierX.length;
    time += dt;

    // Keep trace length reasonable
    if (pathTrace.length > fourierX.length) {
        pathTrace.pop();
    }

    if (time > 2 * Math.PI) {
        time = 0;
        // pathTrace = []; // Don't clear, let it loop
    }

    animationId = requestAnimationFrame(animate);
}
