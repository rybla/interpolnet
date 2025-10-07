const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');

const width = 800;
const height = 600;
canvas.width = width;
canvas.height = height;

const cellSize = 5;
const gridWidth = Math.floor(width / cellSize);
const gridHeight = Math.floor(height / cellSize);

const PHEROMONE_STRENGTH = 2.0;

class World {
    constructor() {
        this.grid = new Array(gridWidth).fill(null).map(() => new Array(gridHeight).fill(null).map(() => ({
            food: 0,
            homePheromone: 0,
            foodPheromone: 0,
            isNest: false,
        })));

        this.ants = [];
        this.evaporationRate = 0.99; // Default value
        this.initNest();
        this.initFood();
    }

    initNest() {
        const nestX = Math.floor(gridWidth / 2);
        const nestY = Math.floor(gridHeight / 2);
        this.nestPosition = { x: nestX, y: nestY };
        this.grid[nestX][nestY].isNest = true;
    }

    initFood() {
        for (let i = 0; i < 5; i++) {
            const foodX = Math.floor(Math.random() * gridWidth);
            const foodY = Math.floor(Math.random() * gridHeight);
            this.grid[foodX][foodY].food = 100;
        }
    }

    addFood(x, y, amount) {
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
            this.grid[x][y].food += amount;
        }
    }

    render() {
        ctx.clearRect(0, 0, width, height);

        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const cell = this.grid[x][y];
                ctx.beginPath();
                ctx.rect(x * cellSize, y * cellSize, cellSize, cellSize);

                if (cell.isNest) {
                    ctx.fillStyle = 'brown';
                } else if (cell.food > 0) {
                    ctx.fillStyle = 'green';
                } else if (cell.foodPheromone > 0) {
                    ctx.fillStyle = `rgba(255, 0, 0, ${Math.min(cell.foodPheromone, 1)})`;
                } else if (cell.homePheromone > 0) {
                    ctx.fillStyle = `rgba(0, 0, 255, ${Math.min(cell.homePheromone, 1)})`;
                } else {
                    ctx.fillStyle = 'white';
                }
                ctx.fill();
            }
        }

        this.ants.forEach(ant => ant.render());
    }

    update() {
        this.ants.forEach(ant => ant.update(this.grid, this.nestPosition));
        this.evaporatePheromones();
    }

    evaporatePheromones() {
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const cell = this.grid[x][y];
                cell.homePheromone *= this.evaporationRate;
                cell.foodPheromone *= this.evaporationRate;
            }
        }
    }
}

class Ant {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.direction = Math.random() * 2 * Math.PI;
        this.speed = 1;
        this.state = 'FORAGING'; // FORAGING or RETURNING
        this.hasFood = false;
    }

    update(grid, nestPosition) {
        const gridX = Math.floor(this.x);
        const gridY = Math.floor(this.y);
        const cell = grid[gridX][gridY];

        // State transitions (Food and Nest logic)
        if (this.state === 'FORAGING' && cell.food > 0) {
            this.hasFood = true;
            this.state = 'RETURNING';
            cell.food--;
            this.direction += Math.PI; // Turn around
        } else if (this.state === 'RETURNING' && cell.isNest) {
            this.hasFood = false;
            this.state = 'FORAGING';
            this.direction += Math.PI; // Turn around
        }

        const pheromoneToFollow = this.state === 'FORAGING' ? 'foodPheromone' : 'homePheromone';
        this.steer(grid, pheromoneToFollow, this.state === 'FORAGING' ? 'food' : 'isNest');


        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;

        // Wrap around the world
        if (this.x < 0) this.x = gridWidth - 1;
        if (this.x >= gridWidth) this.x = 0;
        if (this.y < 0) this.y = gridHeight - 1;
        if (this.y >= gridHeight) this.y = 0;

        const currentCellX = Math.floor(this.x);
        const currentCellY = Math.floor(this.y);
        const currentCell = grid[currentCellX][currentCellY];


        // Drop pheromones
        if (this.state === 'RETURNING') { // Has food, returning to nest, drops food pheromone
            currentCell.foodPheromone = Math.min(10, currentCell.foodPheromone + PHEROMONE_STRENGTH);
        } else { // Foraging, drops home pheromone
            currentCell.homePheromone = Math.min(10, currentCell.homePheromone + PHEROMONE_STRENGTH);
        }
    }

    steer(grid, pheromoneToFollow, target) {
        const sensorAngle = Math.PI / 4;
        const sensorDist = 12; // Increased sensor distance

        const aheadDir = this.direction;
        const leftDir = this.direction - sensorAngle;
        const rightDir = this.direction + sensorAngle;

        const aheadPos = { x: this.x + Math.cos(aheadDir) * sensorDist, y: this.y + Math.sin(aheadDir) * sensorDist };
        const leftPos = { x: this.x + Math.cos(leftDir) * sensorDist, y: this.y + Math.sin(leftDir) * sensorDist };
        const rightPos = { x: this.x + Math.cos(rightDir) * sensorDist, y: this.y + Math.sin(rightDir) * sensorDist };

        let aheadPheromone = this.getPheromoneAt(grid, aheadPos.x, aheadPos.y, pheromoneToFollow);
        let leftPheromone = this.getPheromoneAt(grid, leftPos.x, leftPos.y, pheromoneToFollow);
        let rightPheromone = this.getPheromoneAt(grid, rightPos.x, rightPos.y, pheromoneToFollow);

        // Check for target (food or nest)
        if (this.isTargetAt(grid, aheadPos.x, aheadPos.y, target)) aheadPheromone += 100;
        if (this.isTargetAt(grid, leftPos.x, leftPos.y, target)) leftPheromone += 100;
        if (this.isTargetAt(grid, rightPos.x, rightPos.y, target)) rightPheromone += 100;


        if (aheadPheromone > leftPheromone && aheadPheromone > rightPheromone) {
            this.direction += (Math.random() - 0.5) * 0.1; // Slight random wander
        } else if (leftPheromone > rightPheromone) {
            this.direction -= 0.3;
        } else if (rightPheromone > leftPheromone) {
            this.direction += 0.3;
        } else {
            this.direction += (Math.random() - 0.5) * 0.3; // Gentle random turn
        }
    }

    getPheromoneAt(grid, x, y, pheromoneType) {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
            return grid[gridX][gridY][pheromoneType];
        }
        return 0;
    }

    isTargetAt(grid, x, y, targetType) {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
            const cell = grid[gridX][gridY];
            if (targetType === 'food') return cell.food > 0;
            if (targetType === 'isNest') return cell.isNest;
        }
        return false;
    }

    render() {
        ctx.beginPath();
        ctx.arc(this.x * cellSize, this.y * cellSize, cellSize / 2, 0, 2 * Math.PI);
        ctx.fillStyle = this.hasFood ? 'magenta' : 'black';
        ctx.fill();
    }
}

let world;
let animationFrameId;

// --- CONTROLS ---
const antCountSlider = document.getElementById('ant-count');
const antCountValue = document.getElementById('ant-count-value');
const evaporationRateSlider = document.getElementById('evaporation-rate');
const evaporationRateValue = document.getElementById('evaporation-rate-value');
const speedSlider = document.getElementById('speed');
const speedValue = document.getElementById('speed-value');
const restartBtn = document.getElementById('restart-btn');

let antCount = parseInt(antCountSlider.value);
let evaporationRate = parseFloat(evaporationRateSlider.value);
let antSpeed = parseInt(speedSlider.value);

antCountSlider.addEventListener('input', (e) => {
    antCount = parseInt(e.target.value);
    antCountValue.textContent = antCount;
});

evaporationRateSlider.addEventListener('input', (e) => {
    evaporationRate = parseFloat(e.target.value);
    evaporationRateValue.textContent = evaporationRate;
    if(world) world.evaporationRate = evaporationRate;
});

speedSlider.addEventListener('input', (e) => {
    antSpeed = parseInt(e.target.value);
    speedValue.textContent = antSpeed;
    if(world) {
        world.ants.forEach(ant => ant.speed = antSpeed);
    }
});

restartBtn.addEventListener('click', startSimulation);

canvas.addEventListener('click', (e) => {
    if (!world) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);

    world.addFood(gridX, gridY, 100);
});

function startSimulation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    world = new World();
    world.evaporationRate = evaporationRate;
    for (let i = 0; i < antCount; i++) {
        const ant = new Ant(world.nestPosition.x, world.nestPosition.y);
        ant.speed = antSpeed;
        world.ants.push(ant);
    }
    animate();
}


function animate() {
    world.update();
    world.render();
    animationFrameId = requestAnimationFrame(animate);
}

startSimulation();