
const canvas = document.getElementById('cloth-canvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('reset-btn');
const windBtn = document.getElementById('wind-btn');

let width = canvas.width;
let height = canvas.height;

// Simulation parameters
const gravity = 0.5;
const friction = 0.99;
const bounce = 0.9;
const stiffness = 1;
const iterations = 5;
let windEnabled = true;

// Cloth parameters
const spacing = 18;
let particles = [];
let sticks = [];

// Mouse interaction
let isDragging = false;
let isTearing = false;
let draggedParticle = null;
let mouseX = 0;
let mouseY = 0;
const tearRadius = 15;

class Particle {
    constructor(x, y, pinned) {
        this.x = x;
        this.y = y;
        this.oldx = x;
        this.oldy = y;
        this.pinned = pinned;
    }

    update() {
        if (this.pinned) return;

        const vx = (this.x - this.oldx) * friction;
        const vy = (this.y - this.oldy) * friction;

        this.oldx = this.x;
        this.oldy = this.y;

        this.x += vx;
        this.y += vy;
        this.y += gravity;

        if (windEnabled) {
            // More dynamic wind
            const time = Date.now() / 1000;
            const windForce = Math.cos(this.y / 20 + time * 3) * 0.2 + 0.1;
            this.x += windForce;
        }

        // Floor constraint
        if (this.y > height) {
            this.y = height;
            this.oldy = this.y + vy * bounce;
        }

        // Walls
        if (this.x > width) {
            this.x = width;
            this.oldx = this.x + vx * bounce;
        } else if (this.x < 0) {
            this.x = 0;
            this.oldx = this.x + vx * bounce;
        }
    }
}

class Stick {
    constructor(p0, p1) {
        this.p0 = p0;
        this.p1 = p1;
        this.length = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        this.active = true;
    }

    update() {
        if (!this.active) return;

        const dx = this.p1.x - this.p0.x;
        const dy = this.p1.y - this.p0.y;
        const distance = Math.hypot(dx, dy);
        const difference = this.length - distance;
        const percent = (difference / distance) / 2 * stiffness;
        const offsetX = dx * percent;
        const offsetY = dy * percent;

        if (!this.p0.pinned) {
            this.p0.x -= offsetX;
            this.p0.y -= offsetY;
        }
        if (!this.p1.pinned) {
            this.p1.x += offsetX;
            this.p1.y += offsetY;
        }
    }
}

function init() {
    width = canvas.parentElement.clientWidth;
    // Keep 4:3 aspect ratio roughly or fit screen
    height = Math.min(window.innerHeight * 0.7, 600);
    canvas.width = width;
    canvas.height = height;

    particles = [];
    sticks = [];

    const cols = Math.floor(width / spacing) - 4;
    const rows = Math.floor(height / spacing) - 4;

    const startX = (width - cols * spacing) / 2;
    const startY = 20;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const px = startX + x * spacing;
            const py = startY + y * spacing;
            // Pin every 2nd particle on the top row
            const pinned = y === 0 && x % 2 === 0;
            particles.push(new Particle(px, py, pinned));
        }
    }

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            if (x < cols - 1) sticks.push(new Stick(particles[i], particles[i + 1]));
            if (y < rows - 1) sticks.push(new Stick(particles[i], particles[i + cols]));
        }
    }
}

function update() {
    for (let p of particles) p.update();

    for (let i = 0; i < iterations; i++) {
        for (let s of sticks) s.update();
    }

    if (isDragging && draggedParticle) {
        draggedParticle.x = mouseX;
        draggedParticle.y = mouseY;
        draggedParticle.oldx = mouseX;
        draggedParticle.oldy = mouseY;
    }

    if (isTearing) {
        tearSticks();
    }
}

function tearSticks() {
    for (let s of sticks) {
        if (!s.active) continue;
        const midX = (s.p0.x + s.p1.x) / 2;
        const midY = (s.p0.y + s.p1.y) / 2;
        const dx = midX - mouseX;
        const dy = midY - mouseY;
        if (dx * dx + dy * dy < tearRadius * tearRadius) {
            s.active = false;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let s of sticks) {
        if (s.active) {
            ctx.moveTo(s.p0.x, s.p0.y);
            ctx.lineTo(s.p1.x, s.p1.y);
        }
    }
    ctx.stroke();

    // Draw pins
    ctx.fillStyle = '#4CAF50';
    for (let p of particles) {
        if (p.pinned) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Interaction
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);
    mouseX = pos.x;
    mouseY = pos.y;

    if (e.button === 0 && !e.shiftKey) {
        // Find nearest particle
        let nearest = null;
        let minDist = 30;
        for (let p of particles) {
            const d = Math.hypot(p.x - mouseX, p.y - mouseY);
            if (d < minDist) {
                minDist = d;
                nearest = p;
            }
        }
        if (nearest) {
            draggedParticle = nearest;
            isDragging = true;
        }
    } else if (e.button === 2 || e.shiftKey) {
        isTearing = true;
        tearSticks();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePos(e);
    mouseX = pos.x;
    mouseY = pos.y;
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    draggedParticle = null;
    isTearing = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    draggedParticle = null;
    isTearing = false;
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('resize', () => {
    // Optional: Debounce resize or just init
    // init(); // Re-initializing on resize resets the sim, which might be annoying.
    // Better to just update canvas size and let the cloth fall or stay.
    width = canvas.parentElement.clientWidth;
    canvas.width = width;
    // We don't re-init particles to keep the state, but walls might clip particles.
});

resetBtn.addEventListener('click', init);
windBtn.addEventListener('click', () => {
    windEnabled = !windEnabled;
    windBtn.textContent = `Wind: ${windEnabled ? 'On' : 'Off'}`;
    windBtn.classList.toggle('active', windEnabled);
});

// Boot
init();
loop();
