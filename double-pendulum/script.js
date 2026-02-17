class DoublePendulum {
    constructor(g, m1, m2, l1, l2, theta1, theta2, omega1, omega2, color) {
        this.g = g;
        this.m1 = m1;
        this.m2 = m2;
        this.l1 = l1;
        this.l2 = l2;
        this.theta1 = theta1;
        this.theta2 = theta2;
        this.omega1 = omega1;
        this.omega2 = omega2;
        this.color = color;
        this.path = [];
        this.maxPath = 200;
    }

    // Equations of motion
    calculateAccelerations(t1, t2, o1, o2) {
        const g = this.g;
        const m1 = this.m1;
        const m2 = this.m2;
        const l1 = this.l1;
        const l2 = this.l2;

        const num1 = -g * (2 * m1 + m2) * Math.sin(t1) - m2 * g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(t1 - t2) * m2 * (o2 * o2 * l2 + o1 * o1 * l1 * Math.cos(t1 - t2));
        const den1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2));
        const a1 = num1 / den1;

        const num2 = 2 * Math.sin(t1 - t2) * (o1 * o1 * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + o2 * o2 * l2 * m2 * Math.cos(t1 - t2));
        const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2));
        const a2 = num2 / den2;

        return { a1, a2 };
    }

    update(dt) {
        // RK4 Integration
        const k1 = this.derivatives(this.theta1, this.theta2, this.omega1, this.omega2);

        const k2 = this.derivatives(
            this.theta1 + 0.5 * dt * k1.dTheta1,
            this.theta2 + 0.5 * dt * k1.dTheta2,
            this.omega1 + 0.5 * dt * k1.dOmega1,
            this.omega2 + 0.5 * dt * k1.dOmega2
        );

        const k3 = this.derivatives(
            this.theta1 + 0.5 * dt * k2.dTheta1,
            this.theta2 + 0.5 * dt * k2.dTheta2,
            this.omega1 + 0.5 * dt * k2.dOmega1,
            this.omega2 + 0.5 * dt * k2.dOmega2
        );

        const k4 = this.derivatives(
            this.theta1 + dt * k3.dTheta1,
            this.theta2 + dt * k3.dTheta2,
            this.omega1 + dt * k3.dOmega1,
            this.omega2 + dt * k3.dOmega2
        );

        this.theta1 += (dt / 6) * (k1.dTheta1 + 2 * k2.dTheta1 + 2 * k3.dTheta1 + k4.dTheta1);
        this.theta2 += (dt / 6) * (k1.dTheta2 + 2 * k2.dTheta2 + 2 * k3.dTheta2 + k4.dTheta2);
        this.omega1 += (dt / 6) * (k1.dOmega1 + 2 * k2.dOmega1 + 2 * k3.dOmega1 + k4.dOmega1);
        this.omega2 += (dt / 6) * (k1.dOmega2 + 2 * k2.dOmega2 + 2 * k3.dOmega2 + k4.dOmega2);
    }

    derivatives(t1, t2, o1, o2) {
        const { a1, a2 } = this.calculateAccelerations(t1, t2, o1, o2);
        return {
            dTheta1: o1,
            dTheta2: o2,
            dOmega1: a1,
            dOmega2: a2
        };
    }

    draw(ctx, originX, originY, scale) {
        const x1 = originX + this.l1 * Math.sin(this.theta1) * scale;
        const y1 = originY + this.l1 * Math.cos(this.theta1) * scale;

        const x2 = x1 + this.l2 * Math.sin(this.theta2) * scale;
        const y2 = y1 + this.l2 * Math.cos(this.theta2) * scale;

        // Draw arms
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw masses
        ctx.beginPath();
        ctx.arc(x1, y1, Math.sqrt(this.m1) * 2, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x2, y2, Math.sqrt(this.m2) * 2, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Store path
        this.path.push({ x: x2, y: y2 });
        if (this.path.length > this.maxPath) {
            this.path.shift();
        }

        // Draw path (only for primary pendulum usually, or all if chaos)
        // Optimization: Don't draw path here, let the main loop handle trails via fading background.
        // But if we want distinct lines, we can draw them.
        // Let's draw a faint line for the recent path.
        if (this.path.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(this.path[i].x, this.path[i].y);
            }
            ctx.strokeStyle = this.color; // Fade alpha?
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }
}

// --- Main Application ---

const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let animationId;
let pendulums = [];
let isPlaying = true;
let chaosMode = false;

// DOM Elements
const playBtn = document.getElementById('toggle-play');
const resetBtn = document.getElementById('reset');
const chaosBtn = document.getElementById('toggle-chaos');
const inputs = {
    g: document.getElementById('gravity'),
    m1: document.getElementById('mass1'),
    m2: document.getElementById('mass2'),
    l1: document.getElementById('length1'),
    l2: document.getElementById('length2'),
    theta1: document.getElementById('theta1'),
    theta2: document.getElementById('theta2')
};
const displays = {
    g: document.getElementById('gravity-val'),
    m1: document.getElementById('mass1-val'),
    m2: document.getElementById('mass2-val'),
    l1: document.getElementById('length1-val'),
    l2: document.getElementById('length2-val'),
    theta1: document.getElementById('theta1-val'),
    theta2: document.getElementById('theta2-val')
};

function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

function getParams() {
    return {
        g: parseFloat(inputs.g.value),
        m1: parseFloat(inputs.m1.value),
        m2: parseFloat(inputs.m2.value),
        l1: parseFloat(inputs.l1.value),
        l2: parseFloat(inputs.l2.value),
        t1: parseFloat(inputs.theta1.value),
        t2: parseFloat(inputs.theta2.value)
    };
}

function init() {
    const p = getParams();
    pendulums = [];

    if (chaosMode) {
        const count = 50;
        for (let i = 0; i < count; i++) {
            // Small perturbation
            const delta = (i - count / 2) * 0.0001;
            // Color gradient from cyan to magenta
            const hue = 180 + (i / count) * 120;
            const color = `hsl(${hue}, 100%, 50%)`;
            pendulums.push(new DoublePendulum(p.g, p.m1, p.m2, p.l1, p.l2, p.t1 + delta, p.t2 + delta, 0, 0, color));
        }
    } else {
        pendulums.push(new DoublePendulum(p.g, p.m1, p.m2, p.l1, p.l2, p.t1, p.t2, 0, 0, '#00bcd4'));
    }

    // Clear canvas completely on reset
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
}

function update() {
    if (!isPlaying) return;

    // Simulation step
    // Use smaller dt for stability? 1/60s is standard.
    // Maybe multiple sub-steps for accuracy.
    const steps = 5;
    const dt = 0.2 / steps; // Speed multiplier / steps

    for (let s = 0; s < steps; s++) {
        for (let p of pendulums) {
            p.update(dt);
        }
    }
}

function draw() {
    // Fading trails effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Fade out previous frames
    ctx.fillRect(0, 0, width, height);

    const originX = width / 2;
    const originY = height / 3;
    const scale = 1; // 1 pixel per unit of length

    for (let p of pendulums) {
        p.draw(ctx, originX, originY, scale);
    }
}

function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
}

// Event Listeners
playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playBtn.textContent = isPlaying ? 'Pause' : 'Play';
});

resetBtn.addEventListener('click', () => {
    init();
});

chaosBtn.addEventListener('click', () => {
    chaosMode = !chaosMode;
    chaosBtn.classList.toggle('active'); // You might need CSS for .active
    chaosBtn.textContent = chaosMode ? "Normal Mode" : "Chaos Mode";
    init();
});

// Update displays on input change
Object.keys(inputs).forEach(key => {
    inputs[key].addEventListener('input', (e) => {
        displays[key].textContent = e.target.value;
        // If not playing (paused), we might want to live-update the initial state if user is dragging sliders?
        // But complex to sync with running simulation.
        // Best to only update params on reset, or update live params (g, m, l) for fun.

        const val = parseFloat(e.target.value);

        // Update live parameters
        pendulums.forEach(p => {
            if (key === 'g') p.g = val;
            if (key === 'm1') p.m1 = val;
            if (key === 'm2') p.m2 = val;
            if (key === 'l1') p.l1 = val;
            if (key === 'l2') p.l2 = val;
            // Angles are initial conditions, changing them live jumps the pendulum, which is weird but okay.
            // Let's NOT update angles live, only parameters.
        });
    });
});

// Initialize and start
init();
loop();
