// Global scope for testability
const G = 0.1; // Gravitational constant
let bodies = [];

class Body {
    constructor(x, y, mass, vx, vy) {
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.vx = vx;
        this.vy = vy;
        this.radius = Math.pow(mass, 1/3); // Radius proportional to cube root of mass
        this.color = `hsl(${Math.random() * 360}, 100%, 75%)`;
    }

    applyForce(fx, fy) {
        this.vx += fx / this.mass;
        this.vy += fy / this.mass;
    }

    update(canvas) {
        this.x += this.vx;
        this.y += this.vy;

        // Wall bounce
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -0.9;
        } else if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -0.9;
        }

        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -0.9;
        } else if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.vy *= -0.9;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

function calculateForces(currentBodies) {
    for (let i = 0; i < currentBodies.length; i++) {
        for (let j = i + 1; j < currentBodies.length; j++) {
            const bodyA = currentBodies[i];
            const bodyB = currentBodies[j];

            const dx = bodyB.x - bodyA.x;
            const dy = bodyB.y - bodyA.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < (bodyA.radius + bodyB.radius)) continue;

            const dist = Math.sqrt(distSq);
            const force = (G * bodyA.mass * bodyB.mass) / distSq;

            const fx = (force * dx) / dist;
            const fy = (force * dy) / dist;

            bodyA.applyForce(fx, fy);
            bodyB.applyForce(-fx, -fy);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulation-canvas');
    const ctx = canvas.getContext('2d');

    // Controls
    const bodyCountSlider = document.getElementById('body-count');
    const bodyCountDisplay = document.getElementById('body-count-display');
    const massVarianceSlider = document.getElementById('mass-variance');
    const massVarianceDisplay = document.getElementById('mass-variance-display');
    const speedVarianceSlider = document.getElementById('speed-variance');
    const speedVarianceDisplay = document.getElementById('speed-variance-display');
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const resetButton = document.getElementById('reset-button');

    let numBodies = bodyCountSlider.value;
    let massVariance = massVarianceSlider.value;
    let speedVariance = speedVarianceSlider.value;

    let animationFrameId;
    let isPaused = true;

    function resizeCanvas() {
        const main = document.querySelector('main');
        canvas.width = main.clientWidth;
        canvas.height = main.clientWidth * (9 / 16);
    }

    function initSimulation() {
        bodies = [];
        for (let i = 0; i < numBodies; i++) {
            const mass = (Math.random() * 0.9 + 0.1) * massVariance * 5;
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const vx = (Math.random() - 0.5) * speedVariance;
            const vy = (Math.random() - 0.5) * speedVariance;
            bodies.push(new Body(x, y, mass, vx, vy));
        }
    }

    function animate() {
        if (isPaused) {
            return;
        }

        // Particle trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        calculateForces(bodies);

        bodies.forEach(body => {
            body.update(canvas);
            body.draw(ctx);
        });

        animationFrameId = requestAnimationFrame(animate);
    }

    function startSimulation() {
        if (isPaused) {
            isPaused = false;
            startButton.textContent = 'Running...';
            startButton.disabled = true;
            pauseButton.disabled = false;
            animate();
        }
    }

    function pauseSimulation() {
        isPaused = true;
        startButton.textContent = 'Resume';
        startButton.disabled = false;
        pauseButton.disabled = true;
        cancelAnimationFrame(animationFrameId);
    }

    function resetSimulation() {
        isPaused = true;
        cancelAnimationFrame(animationFrameId);
        resizeCanvas();
        initSimulation();
        // Redraw canvas after reset
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        bodies.forEach(body => body.draw(ctx));
        startButton.textContent = 'Start';
        startButton.disabled = false;
        pauseButton.disabled = true;
    }

    // Event Listeners
    bodyCountSlider.addEventListener('input', (e) => {
        numBodies = e.target.value;
        bodyCountDisplay.textContent = numBodies;
    });

    massVarianceSlider.addEventListener('input', (e) => {
        massVariance = e.target.value;
        massVarianceDisplay.textContent = parseFloat(massVariance).toFixed(1);
    });

    speedVarianceSlider.addEventListener('input', (e) => {
        speedVariance = e.target.value;
        speedVarianceDisplay.textContent = parseFloat(speedVariance).toFixed(1);
    });

    // Reset simulation when sliders are released
    bodyCountSlider.addEventListener('change', resetSimulation);
    massVarianceSlider.addEventListener('change', resetSimulation);
    speedVarianceSlider.addEventListener('change', resetSimulation);

    startButton.addEventListener('click', startSimulation);
    pauseButton.addEventListener('click', pauseSimulation);
    resetButton.addEventListener('click', resetSimulation);
    window.addEventListener('resize', resetSimulation);

    // Initial setup
    pauseButton.disabled = true;
    resetSimulation();
});