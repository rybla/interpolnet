document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('sim-canvas');
    const ctx = canvas.getContext('2d');

    // Resize canvas to match display size
    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 400; // Fixed height
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Simulation Parameters
    const gravity = 0.5;
    const droneMass = 1.0;

    // PID Controller State
    let kp = 0.0;
    let ki = 0.0;
    let kd = 0.0;
    let setpoint = 300; // Target height (y-coordinate, so lower is higher on screen)

    // Simulation State
    let drone = {
        y: 350,
        velocity: 0,
        thrust: 0
    };

    let integral = 0;
    let previousError = 0;
    let lastTime = performance.now();

    // History for Graph
    const maxHistory = 300;
    let history = []; // Array of {y, setpoint} objects

    // UI Elements
    const kpInput = document.getElementById('kp');
    const kiInput = document.getElementById('ki');
    const kdInput = document.getElementById('kd');
    const setpointInput = document.getElementById('setpoint');
    const resetBtn = document.getElementById('reset-btn');

    const kpVal = document.getElementById('kp-val');
    const kiVal = document.getElementById('ki-val');
    const kdVal = document.getElementById('kd-val');
    const setpointVal = document.getElementById('setpoint-val');

    // Update values from sliders
    function updateParams() {
        kp = parseFloat(kpInput.value);
        ki = parseFloat(kiInput.value);
        kd = parseFloat(kdInput.value);
        setpoint = parseFloat(setpointInput.value);

        kpVal.textContent = kp.toFixed(2);
        kiVal.textContent = ki.toFixed(3);
        kdVal.textContent = kd.toFixed(1);
        setpointVal.textContent = setpoint;
    }

    // Event Listeners
    kpInput.addEventListener('input', updateParams);
    kiInput.addEventListener('input', updateParams);
    kdInput.addEventListener('input', updateParams);
    setpointInput.addEventListener('input', updateParams);

    resetBtn.addEventListener('click', () => {
        drone.y = canvas.height - 50;
        drone.velocity = 0;
        drone.thrust = 0;
        integral = 0;
        previousError = 0;
        history = [];
    });

    // Main Loop
    function loop(timestamp) {
        const dt = (timestamp - lastTime) / 16.67; // Normalize to ~60fps
        lastTime = timestamp;

        // 1. Calculate Error
        // In canvas coordinates, larger Y is lower.
        // If we want to reach setpoint (e.g. 100), and we are at 300, error is (300 - 100) = 200.
        // Positive error means we are too low.
        const error = drone.y - setpoint;

        // 2. PID Calculations

        // Integral
        integral += error * dt;

        // Anti-windup clamping for integral term
        // Prevents integral from growing too large if error persists
        const integralLimit = 1000;
        if (integral > integralLimit) integral = integralLimit;
        if (integral < -integralLimit) integral = -integralLimit;

        // Derivative
        const derivative = (error - previousError) / dt;
        previousError = error;

        // PID Output (Thrust)
        // Base thrust to counteract gravity is approx mass * gravity
        // We add PID output to this base.
        const output = (kp * error) + (ki * integral) + (kd * derivative);

        // Apply thrust
        // Total force = Thrust - Gravity
        // F = ma -> a = F/m
        // We can model thrust as simply adding to upward acceleration.
        // Since Y is down, negative force is Up.
        // Gravity is positive (down).

        // Drone needs a base thrust to hover (counteract gravity)
        // If error is 0, we want thrust = gravity * mass
        // But in a pure PID, the I term usually takes over this job.
        // For visual simplicity, let's just apply the PID output as a correction force
        // and see if the user can tune it to hover.

        // Actually, to make it easier to tune, let's assume the motors can produce
        // upward force.
        // Force_up = output
        // Net_force = Gravity - Force_up (assuming output is positive for "go up")

        // Let's retry the sign convention:
        // Error = (Target - Current) ??
        // Let's stick to standard: Error = Setpoint - ProcessValue
        // Setpoint is a Y value (e.g. 100). Current is Y (e.g. 300).
        // If we want to go from 300 to 100 (Up), we need negative velocity.
        // So we need negative acceleration.
        // Error = 100 - 300 = -200.
        // P-term = Kp * -200 = negative value.
        // So a negative output should produce upward force.

        // Let's redefine error for intuitive "up/down" logic
        // Target Y is setpoint.
        // Current Y is drone.y.
        // We want to drive Current Y to Target Y.

        // Let's just use the calculated output directly as acceleration.
        // Gravity pulls down (+Y).
        // Thrust pushes up (-Y).

        // Force = output
        // If error is positive (drone lower than setpoint), we want negative force (up).
        // So we need output to be negative.
        // Error = Setpoint - drone.y (100 - 300 = -200) -> Output negative -> Up. Correct.

        // Let's recalculate error with this convention
        const pError = setpoint - drone.y; // e.g. 100 - 300 = -200

        // Integral
        // We use a different variable scope for the loop
        // But we need to update the global integral/previousError variables
        // Let's reuse the outer variables but update logic here

        // Resetting logic to match the new sign convention
        // error was defined earlier as drone.y - setpoint. Let's invert it to standard
        // Error = setpoint - measurement
        const stdError = setpoint - drone.y;

        // Update integral
        integral += stdError * dt;
        // Clamp integral
        if (integral > integralLimit) integral = integralLimit;
        if (integral < -integralLimit) integral = -integralLimit;

        const stdDerivative = (stdError - previousError) / dt;
        previousError = stdError;

        const pidOutput = (kp * stdError) + (ki * integral) + (kd * stdDerivative);

        // Physics Update
        // Accel = Force / Mass
        // Forces: Gravity (down/positive), Thrust (up/negative)
        // We treat pidOutput as the "correction acceleration" relative to gravity
        // Or we can treat it as a force.
        // Let's say pidOutput is the Force applied.
        // Ideally, we need to fight gravity.
        // Gravity force = mass * gravity
        // Total Force = (mass * gravity) + pidOutput
        // Wait, if pidOutput is 0, we fall.
        // If we want to hover, pidOutput must be - (mass * gravity).
        // stdError would be negative if we are below target? No.
        // If Setpoint=100, Y=300 (lower physically).
        // stdError = 100 - 300 = -200.
        // Kp * -200 is negative force (Up). Correct.

        // So:
        const force = (droneMass * gravity) + pidOutput;
        // Note: gravity is an acceleration constant, so force due to gravity is m*g.
        // We add pidOutput. If pidOutput is negative enough, it overcomes gravity.

        const acceleration = force / droneMass;

        drone.velocity += acceleration * dt;
        drone.y += drone.velocity * dt;

        // Floor/Ceiling collision
        if (drone.y > canvas.height - 20) {
            drone.y = canvas.height - 20;
            drone.velocity *= -0.5; // Bounce
            integral = 0; // Reset integral on collision to prevent windup while stuck
        }
        if (drone.y < 20) {
            drone.y = 20;
            drone.velocity *= -0.5;
        }

        // 3. Visualization
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Setpoint Line
        ctx.beginPath();
        ctx.strokeStyle = '#00bcd4';
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, setpoint);
        ctx.lineTo(canvas.width, setpoint);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#00bcd4';
        ctx.fillText(`Target: ${setpoint}`, 10, setpoint - 5);

        // Draw Drone
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(canvas.width / 2 - 20, drone.y - 10, 40, 20);
        // Draw "propellers"
        ctx.fillStyle = '#aaa';
        ctx.fillRect(canvas.width / 2 - 25, drone.y - 15, 50, 5);

        // Draw History Graph
        history.push({y: drone.y, target: setpoint});
        if (history.length > maxHistory) {
            history.shift();
        }

        // Draw graph background
        const graphX = 50;
        const graphY = 50;
        const graphW = 200;
        const graphH = 100;

        // We'll overlay the graph on the canvas, maybe top right?
        // Let's make it more subtle, running across the background?
        // Or just a line trailing the drone?

        // Let's draw a trail behind the drone
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 87, 34, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < history.length; i++) {
            // Map history index to x position relative to drone or static?
            // Let's do a scrolling graph on the left side
            const x = i * (canvas.width / maxHistory);
            const point = history[i];
            if (i === 0) ctx.moveTo(x, point.y);
            else ctx.lineTo(x, point.y);
        }
        ctx.stroke();

        // Draw Setpoint History
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 188, 212, 0.3)';
        for (let i = 0; i < history.length; i++) {
            const x = i * (canvas.width / maxHistory);
            const point = history[i];
            if (i === 0) ctx.moveTo(x, point.target);
            else ctx.lineTo(x, point.target);
        }
        ctx.stroke();

        requestAnimationFrame(loop);
    }

    // Initialize
    updateParams();
    requestAnimationFrame(loop);
});
