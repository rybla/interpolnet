const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');

const width = 800;
const height = 600;
canvas.width = width;
canvas.height = height;

// --- CONFIG ---
let populationSize = 100;
let mutationRate = 0.01;
let lifespan = 400;

// --- STATE ---
let population;
let count = 0;
let generation = 0;
let target = { x: width / 2, y: 50 };
let obstacle = { x: width / 2 - 100, y: height / 2, w: 200, h: 20 };
let animationId;

// --- DOM ELEMENTS ---
const genCountSpan = document.getElementById('gen-count');
const successRateSpan = document.getElementById('success-rate');
const popSizeInput = document.getElementById('pop-size');
const popSizeVal = document.getElementById('pop-size-val');
const mutationRateInput = document.getElementById('mutation-rate');
const mutationRateVal = document.getElementById('mutation-rate-val');
const lifespanInput = document.getElementById('lifespan');
const lifespanVal = document.getElementById('lifespan-val');
const resetBtn = document.getElementById('reset-btn');

// --- VECTOR CLASS ---
class Vector {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    copy() {
        return new Vector(this.x, this.y);
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const m = this.mag();
        if (m !== 0) {
            this.mult(1 / m);
        }
        return this;
    }

    static random2D() {
        const angle = Math.random() * Math.PI * 2;
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
}

// --- DNA CLASS ---
class DNA {
    constructor(genes) {
        if (genes) {
            this.genes = genes;
        } else {
            this.genes = [];
            for (let i = 0; i < lifespan; i++) {
                this.genes[i] = Vector.random2D();
                this.genes[i].mult(0.2); // Max force
            }
        }
    }

    crossover(partner) {
        const newGenes = [];
        const mid = Math.floor(Math.random() * this.genes.length);
        for (let i = 0; i < this.genes.length; i++) {
            if (i > mid) {
                newGenes[i] = this.genes[i];
            } else {
                newGenes[i] = partner.genes[i];
            }
        }
        return new DNA(newGenes);
    }

    mutation() {
        for (let i = 0; i < this.genes.length; i++) {
            if (Math.random() < mutationRate) {
                this.genes[i] = Vector.random2D();
                this.genes[i].mult(0.2);
            }
        }
    }
}

// --- ROCKET CLASS ---
class Rocket {
    constructor(dna) {
        this.pos = new Vector(width / 2, height - 20);
        this.vel = new Vector();
        this.acc = new Vector();
        this.dna = dna || new DNA();
        this.fitness = 0;
        this.completed = false;
        this.crashed = false;
        this.finishTime = 0;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        const d = Math.sqrt(Math.pow(this.pos.x - target.x, 2) + Math.pow(this.pos.y - target.y, 2));

        if (d < 10) {
            this.completed = true;
            this.pos = new Vector(target.x, target.y);
            if(this.finishTime === 0) this.finishTime = count;
        }

        // Obstacle hit check
        if (
            this.pos.x > obstacle.x &&
            this.pos.x < obstacle.x + obstacle.w &&
            this.pos.y > obstacle.y &&
            this.pos.y < obstacle.y + obstacle.h
        ) {
            this.crashed = true;
        }

        // Screen boundary check
        if (this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height) {
            this.crashed = true;
        }

        if (!this.completed && !this.crashed) {
            this.applyForce(this.dna.genes[count]);
            this.vel.add(this.acc);
            this.pos.add(this.vel);
            this.acc.mult(0);
            this.vel.mult(0.99); // Slight air resistance?
        }
    }

    calcFitness() {
        const d = Math.sqrt(Math.pow(this.pos.x - target.x, 2) + Math.pow(this.pos.y - target.y, 2));
        this.fitness = 1 / (d + 1); // Avoid division by zero

        if (this.completed) {
            this.fitness *= 10;
            // Reward faster completion
            this.fitness *= (lifespan / (this.finishTime + 1));
        }
        if (this.crashed) {
            this.fitness /= 10;
        }
    }

    show() {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        const heading = Math.atan2(this.vel.y, this.vel.x);
        ctx.rotate(heading + Math.PI / 2);

        if(this.completed) {
            ctx.fillStyle = '#03dac6';
        } else if (this.crashed) {
            ctx.fillStyle = '#cf6679';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        }

        // Draw simple triangle
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-5, 5);
        ctx.lineTo(5, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// --- POPULATION CLASS ---
class Population {
    constructor() {
        this.rockets = [];
        this.popSize = populationSize;
        for (let i = 0; i < this.popSize; i++) {
            this.rockets[i] = new Rocket();
        }
        this.matingPool = [];
    }

    evaluate() {
        let maxFit = 0;
        let successCount = 0;
        for (let i = 0; i < this.popSize; i++) {
            this.rockets[i].calcFitness();
            if (this.rockets[i].fitness > maxFit) {
                maxFit = this.rockets[i].fitness;
            }
            if(this.rockets[i].completed) successCount++;
        }

        successRateSpan.textContent = Math.round((successCount / this.popSize) * 100) + '%';

        // Normalize fitness
        for (let i = 0; i < this.popSize; i++) {
            this.rockets[i].fitness /= maxFit;
        }

        this.matingPool = [];
        for (let i = 0; i < this.popSize; i++) {
            let n = this.rockets[i].fitness * 100;
            for (let j = 0; j < n; j++) {
                this.matingPool.push(this.rockets[i]);
            }
        }
    }

    selection() {
        const newRockets = [];
        for (let i = 0; i < this.rockets.length; i++) {
            // Random parent selection
            if(this.matingPool.length === 0) {
                 // Fallback if no fitness (e.g. all crashed same distance?)
                 newRockets[i] = new Rocket();
                 continue;
            }

            const parentA = this.matingPool[Math.floor(Math.random() * this.matingPool.length)].dna;
            const parentB = this.matingPool[Math.floor(Math.random() * this.matingPool.length)].dna;
            const child = parentA.crossover(parentB);
            child.mutation();
            newRockets[i] = new Rocket(child);
        }
        this.rockets = newRockets;
    }

    run() {
        for (let i = 0; i < this.popSize; i++) {
            this.rockets[i].update();
            this.rockets[i].show();
        }
    }
}

// --- MAIN LOOP ---
function init() {
    population = new Population();
    count = 0;
    generation = 1;
    genCountSpan.textContent = generation;
}

function drawTarget() {
    ctx.fillStyle = '#bb86fc';
    ctx.beginPath();
    ctx.arc(target.x, target.y, 10, 0, Math.PI * 2);
    ctx.fill();
}

function drawObstacle() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    population.run();
    drawTarget();
    drawObstacle();

    count++;

    if (count == lifespan) {
        population.evaluate();
        population.selection();
        count = 0;
        generation++;
        genCountSpan.textContent = generation;
    }

    animationId = requestAnimationFrame(animate);
}

// --- EVENT LISTENERS ---
popSizeInput.addEventListener('input', (e) => {
    populationSize = parseInt(e.target.value);
    popSizeVal.textContent = populationSize;
    // Note: Changing population size mid-simulation takes effect next reset or partly next gen
    // To be clean, we'll reset on input change? Or just let it apply next reset?
    // Let's reset for clarity.
    resetSimulation();
});

mutationRateInput.addEventListener('input', (e) => {
    mutationRate = parseFloat(e.target.value);
    mutationRateVal.textContent = mutationRate;
});

lifespanInput.addEventListener('input', (e) => {
    lifespan = parseInt(e.target.value);
    lifespanVal.textContent = lifespan;
    resetSimulation();
});

resetBtn.addEventListener('click', resetSimulation);

function resetSimulation() {
    cancelAnimationFrame(animationId);
    init();
    animate();
}

// --- START ---
init();
animate();
