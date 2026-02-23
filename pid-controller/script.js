class PIDController {
    constructor(kp, ki, kd, setpoint) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.setpoint = setpoint;

        this.prevError = 0;
        this.integral = 0;
    }

    update(currentValue, dt) {
        const error = this.setpoint - currentValue;

        // Integral term with anti-windup clamping
        this.integral += error * dt;

        // Clamp integral to prevent infinite buildup
        // Limit integral contribution to +/- maxThrust roughly
        const integralLimit = 50.0;
        if (this.integral > integralLimit) this.integral = integralLimit;
        if (this.integral < -integralLimit) this.integral = -integralLimit;

        // Derivative term
        const derivative = (error - this.prevError) / dt;

        const output = (this.kp * error) + (this.ki * this.integral) + (this.kd * derivative);

        this.prevError = error;

        return output;
    }

    reset() {
        this.prevError = 0;
        this.integral = 0;
    }
}

class Simulation {
    constructor() {
        this.simCanvas = document.getElementById('sim-canvas');
        this.simCtx = this.simCanvas.getContext('2d');
        this.graphCanvas = document.getElementById('graph-canvas');
        this.graphCtx = this.graphCanvas.getContext('2d');

        // Physics constants
        this.gravity = 25.0; // Downward acceleration
        this.mass = 1.0;
        this.maxThrust = 80.0; // Maximum upward force

        // Drone state (y=0 is bottom, y=100 is top)
        this.position = 0; // Starts on ground
        this.velocity = 0;
        this.currentThrust = 0;

        // PID
        this.pid = new PIDController(1.0, 0.0, 0.0, 50.0);

        // Graph history
        this.history = [];
        this.maxHistory = 600; // frames

        // Time
        this.lastTime = 0;

        // Setup
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // UI
        this.setupControls();

        // Start loop
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        // Set canvas resolution to match display size
        // We use offsetWidth/Height to get the CSS size
        this.simCanvas.width = this.simCanvas.offsetWidth;
        this.simCanvas.height = this.simCanvas.offsetHeight;
        this.graphCanvas.width = this.graphCanvas.offsetWidth;
        this.graphCanvas.height = this.graphCanvas.offsetHeight;
    }

    setupControls() {
        const kpInput = document.getElementById('kp');
        const kiInput = document.getElementById('ki');
        const kdInput = document.getElementById('kd');
        const setpointInput = document.getElementById('setpoint');

        const kpVal = document.getElementById('kp-val');
        const kiVal = document.getElementById('ki-val');
        const kdVal = document.getElementById('kd-val');
        const setpointVal = document.getElementById('setpoint-val');

        const updatePID = () => {
            this.pid.kp = parseFloat(kpInput.value);
            this.pid.ki = parseFloat(kiInput.value);
            this.pid.kd = parseFloat(kdInput.value);
            this.pid.setpoint = parseFloat(setpointInput.value);

            kpVal.textContent = this.pid.kp.toFixed(1);
            kiVal.textContent = this.pid.ki.toFixed(2);
            kdVal.textContent = this.pid.kd.toFixed(1);
            setpointVal.textContent = this.pid.setpoint.toFixed(0);
        };

        kpInput.addEventListener('input', updatePID);
        kiInput.addEventListener('input', updatePID);
        kdInput.addEventListener('input', updatePID);
        setpointInput.addEventListener('input', updatePID);

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.position = 0;
            this.velocity = 0;
            this.currentThrust = 0;
            this.pid.reset();
            this.history = [];
        });

        document.getElementById('disturbance-btn').addEventListener('click', () => {
            // Apply a sudden random velocity impulse (wind gust)
            // Can be up or down
            const gust = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 20);
            this.velocity += gust;
        });

        // Trigger initial update
        updatePID();
    }

    loop(timestamp) {
        if (!this.lastTime) {
            this.lastTime = timestamp;
            requestAnimationFrame((t) => this.loop(t));
            return;
        }

        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (dt > 0.1) dt = 0.1; // Cap large dt (e.g. tab switch)

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Calculate PID output
        // The PID output is interpreted as "desired thrust adjustment"
        // But usually PID outputs the control signal directly.
        // Let's say we have a "base thrust" to hover?
        // Or we let the Integral term find the hover thrust?
        // If we only use P, we will have steady state error because we need non-zero thrust to hover (error must be non-zero).
        // Adding I term fixes this.
        // So we interpret PID output directly as Thrust.

        let controlOutput = this.pid.update(this.position, dt);

        // To make it easier for users, we can add a "Feed Forward" term which is gravity compensation?
        // No, let's let them find it with Integral or just P error.
        // Actually, for a drone, usually user controls throttle, and FC stabilizes rate.
        // Here we are controlling Altitude.
        // So yes, Integral is needed for zero error.

        // Let's add a hidden base bias? No, pure PID is more educational.

        this.currentThrust = controlOutput;

        // Clamp thrust
        if (this.currentThrust < 0) this.currentThrust = 0;
        if (this.currentThrust > this.maxThrust) this.currentThrust = this.maxThrust;

        // Apply physics
        // F = ma -> a = F/m
        // Forces: Thrust (up), Gravity (down)
        const acceleration = (this.currentThrust / this.mass) - this.gravity;

        this.velocity += acceleration * dt;
        this.position += this.velocity * dt;

        // Ground collision
        if (this.position < 0) {
            this.position = 0;
            if (this.velocity < 0) this.velocity = -this.velocity * 0.3; // Bounce slightly
            else this.velocity = 0;
        }

        // Ceiling collision
        if (this.position > 100) {
            this.position = 100;
            this.velocity = 0;
        }

        // Store history
        this.history.push({
            y: this.position,
            target: this.pid.setpoint
        });

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    draw() {
        this.drawSim();
        this.drawGraph();
    }

    drawSim() {
        const ctx = this.simCtx;
        const w = this.simCanvas.width;
        const h = this.simCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Draw sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Draw scale/ruler
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        for (let i = 0; i <= 100; i += 10) {
            const y = h - (i / 100) * h;
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);

            // Text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px Arial';
            ctx.fillText(i, 5, y - 2);
        }
        ctx.stroke();

        // Draw Target Line
        const targetY = h - (this.pid.setpoint / 100) * h;
        ctx.strokeStyle = '#4caf50'; // Green
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(w, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw text for target
        ctx.fillStyle = '#4caf50';
        ctx.fillText("TARGET", w - 50, targetY - 5);

        // Draw Drone
        const droneY = h - (this.position / 100) * h;
        const droneW = 60;
        const droneH = 15;
        const droneX = w/2 - droneW/2;

        // Drone Body
        ctx.fillStyle = '#00bcd4'; // Blue
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00bcd4';
        ctx.fillRect(droneX, droneY - droneH/2, droneW, droneH);
        ctx.shadowBlur = 0;

        // Propellers (spinning visual)
        ctx.fillStyle = '#ccc';
        ctx.fillRect(droneX - 5, droneY - droneH/2 - 5, 20, 2);
        ctx.fillRect(droneX + droneW - 15, droneY - droneH/2 - 5, 20, 2);

        // Thrust (flame)
        if (this.currentThrust > 0) {
            const flameHeight = (this.currentThrust / this.maxThrust) * 50;

            ctx.beginPath();
            ctx.moveTo(droneX + 15, droneY + droneH/2);
            ctx.lineTo(droneX + 25, droneY + droneH/2 + flameHeight);
            ctx.lineTo(droneX + 35, droneY + droneH/2);

            ctx.fillStyle = 'rgba(255, 100, 0, 0.8)';
            ctx.fill();

            // Second flame
             ctx.beginPath();
            ctx.moveTo(droneX + droneW - 35, droneY + droneH/2);
            ctx.lineTo(droneX + droneW - 25, droneY + droneH/2 + flameHeight);
            ctx.lineTo(droneX + droneW - 15, droneY + droneH/2);
             ctx.fill();
        }

        // Draw values text
        ctx.fillStyle = '#fff';
        ctx.font = '14px Consolas, monospace';
        ctx.fillText(`Alt: ${this.position.toFixed(1)}`, 10, 20);
        ctx.fillText(`Vel: ${this.velocity.toFixed(1)}`, 10, 35);
        ctx.fillText(`Thrust: ${this.currentThrust.toFixed(1)}`, 10, 50);
    }

    drawGraph() {
        const ctx = this.graphCtx;
        const w = this.graphCanvas.width;
        const h = this.graphCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<=5; i++) {
            let y = h - (i * 20 / 100) * h; // 0, 20, 40, 60, 80, 100
             ctx.moveTo(0, y);
             ctx.lineTo(w, y);
        }
        ctx.stroke();

        if (this.history.length < 2) return;

        // Scale factors
        const xStep = w / this.maxHistory;

        // Draw Target Path
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.history.forEach((point, i) => {
            const x = i * xStep;
            const y = h - (point.target / 100) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Actual Path
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.history.forEach((point, i) => {
            const x = i * xStep;
            const y = h - (point.y / 100) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Legend
        ctx.fillStyle = '#4caf50';
        ctx.fillText("Target", w - 50, 20);
        ctx.fillStyle = '#00bcd4';
        ctx.fillText("Actual", w - 50, 35);
    }
}

// Start
window.onload = () => {
    new Simulation();
};
