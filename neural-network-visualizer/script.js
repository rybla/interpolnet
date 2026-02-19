class Perceptron {
    constructor(numInputs) {
        this.weights = new Array(numInputs).fill(0).map(() => Math.random() * 2 - 1);
        this.bias = Math.random() * 2 - 1;
        this.learningRate = 0.01;
    }

    predict(inputs) {
        let sum = this.bias;
        for (let i = 0; i < this.weights.length; i++) {
            sum += inputs[i] * this.weights[i];
        }
        return sum >= 0 ? 1 : -1;
    }

    train(inputs, target) {
        const guess = this.predict(inputs);
        const error = target - guess;

        if (error !== 0) {
            for (let i = 0; i < this.weights.length; i++) {
                this.weights[i] += error * inputs[i] * this.learningRate;
            }
            this.bias += error * this.learningRate;
        }
        return error === 0; // Returns true if correct
    }
}

class Point {
    constructor(x, y, label) {
        this.x = x;
        this.y = y;
        this.label = label; // 1 or -1
    }
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const trainBtn = document.getElementById('train-btn');
const autoBtn = document.getElementById('auto-btn');
const resetBtn = document.getElementById('reset-btn');
const clearBtn = document.getElementById('clear-btn');
const lrSlider = document.getElementById('learning-rate');
const lrValue = document.getElementById('lr-value');
const epochDisplay = document.getElementById('epoch-display');
const accuracyDisplay = document.getElementById('accuracy-display');

let perceptron = new Perceptron(2);
let points = [];
let epoch = 0;
let isAutoTraining = false;
let animationId;

// Coordinate transformation: Screen (0..width, 0..height) to Cartesian (-1..1, -1..1)
function mapToCartesian(x, y) {
    return {
        x: (x / width) * 2 - 1,
        y: -((y / height) * 2 - 1)
    };
}

function mapToScreen(x, y) {
    return {
        x: (x + 1) / 2 * width,
        y: (-y + 1) / 2 * height
    };
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid/axis
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw decision boundary
    // Line equation: w0*x + w1*y + b = 0
    // y = (-w0*x - b) / w1
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const w0 = perceptron.weights[0];
    const w1 = perceptron.weights[1];
    const b = perceptron.bias;

    // We want to draw the line segment that intersects the view box (-1, -1) to (1, 1).
    // Simple way: calculate y for x=-1 and x=1.

    // Avoid division by zero
    if (Math.abs(w1) > 0.0001) {
        let x1 = -1;
        let y1 = (-w0 * x1 - b) / w1;
        let x2 = 1;
        let y2 = (-w0 * x2 - b) / w1;

        let p1 = mapToScreen(x1, y1);
        let p2 = mapToScreen(x2, y2);

        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
    } else {
        // Vertical line: x = -b / w0
        let x = -b / w0;
        let p1 = mapToScreen(x, -1);
        let p2 = mapToScreen(x, 1);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // Draw points
    for (let p of points) {
        const screenP = mapToScreen(p.x, p.y);
        ctx.beginPath();
        if (p.label === 1) {
            ctx.fillStyle = '#0f0'; // Green
            ctx.arc(screenP.x, screenP.y, 6, 0, Math.PI * 2);
        } else {
            ctx.fillStyle = '#f00'; // Red
            ctx.rect(screenP.x - 5, screenP.y - 5, 10, 10);
        }
        ctx.fill();

        // Draw prediction visualization (outline)
        const guess = perceptron.predict([p.x, p.y]);
        if (guess === p.label) {
            ctx.strokeStyle = '#fff'; // Correct
            ctx.lineWidth = 1;
        } else {
            ctx.strokeStyle = '#ff0'; // Incorrect (Yellow)
            ctx.lineWidth = 2;
        }
        ctx.stroke();
    }
}

function updateAccuracy() {
    if (points.length === 0) {
        accuracyDisplay.textContent = '0%';
        return;
    }
    let correct = 0;
    for (let p of points) {
        if (perceptron.predict([p.x, p.y]) === p.label) {
            correct++;
        }
    }
    const acc = (correct / points.length) * 100;
    accuracyDisplay.textContent = acc.toFixed(1) + '%';
}

function trainOneEpoch() {
    if (points.length === 0) return;

    let correctCount = 0;
    // Shuffle points for better training
    const shuffledPoints = [...points].sort(() => Math.random() - 0.5);

    for (let p of shuffledPoints) {
        const isCorrect = perceptron.train([p.x, p.y], p.label);
        if (isCorrect) correctCount++;
    }
    epoch++;
    epochDisplay.textContent = epoch;
    updateAccuracy();
    draw();
}

function animate() {
    if (isAutoTraining) {
        trainOneEpoch();
        animationId = requestAnimationFrame(animate);
    }
}

// Interaction
canvas.addEventListener('mousedown', (e) => {
    // Get mouse pos relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cartesian = mapToCartesian(x, y);

    // Left click (0) = Class 1, Right click (2) = Class -1
    let label = 1;
    if (e.button === 2) {
        label = -1;
    }

    points.push(new Point(cartesian.x, cartesian.y, label));
    draw();
    updateAccuracy();
});

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

trainBtn.addEventListener('click', () => {
    trainOneEpoch();
});

autoBtn.addEventListener('click', () => {
    isAutoTraining = !isAutoTraining;
    if (isAutoTraining) {
        autoBtn.textContent = 'Auto Train: ON';
        autoBtn.classList.add('active');
        animate();
    } else {
        autoBtn.textContent = 'Auto Train: OFF';
        autoBtn.classList.remove('active');
        cancelAnimationFrame(animationId);
    }
});

resetBtn.addEventListener('click', () => {
    perceptron = new Perceptron(2);
    perceptron.learningRate = parseFloat(lrSlider.value);
    epoch = 0;
    epochDisplay.textContent = epoch;
    isAutoTraining = false;
    autoBtn.textContent = 'Auto Train: OFF';
    autoBtn.classList.remove('active');
    cancelAnimationFrame(animationId);
    draw();
    updateAccuracy();
});

clearBtn.addEventListener('click', () => {
    points = [];
    epoch = 0;
    epochDisplay.textContent = epoch;
    updateAccuracy();
    draw();
});

lrSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    perceptron.learningRate = val;
    lrValue.textContent = val;
});

// Initial draw
draw();
