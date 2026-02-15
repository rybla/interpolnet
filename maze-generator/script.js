document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('maze-canvas');
    const ctx = canvas.getContext('2d');
    const generateBtn = document.getElementById('generate-btn');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const sizeSlider = document.getElementById('size');
    const speedSlider = document.getElementById('speed');
    const sizeValue = document.getElementById('size-value');
    const statusText = document.getElementById('status-text');

    let cols, rows;
    let w = 20; // Cell size
    let grid = [];
    let current; // Current cell for generation
    let stack = []; // Stack for generation
    let solutionPath = []; // Array of cells for solution
    let openSet = []; // For A*
    let closedSet = []; // For A*
    let start, end;
    let isGenerating = false;
    let isSolving = false;
    let animationId;

    // Setup initial state
    function setup() {
        cancelAnimationFrame(animationId);
        isGenerating = false;
        isSolving = false;
        grid = [];
        stack = [];
        solutionPath = [];
        openSet = [];
        closedSet = [];

        // Calculate columns and rows based on slider
        const size = parseInt(sizeSlider.value);
        w = Math.floor(600 / size); // Adjust cell size based on grid size
        // Ensure canvas fits
        canvas.width = w * size;
        canvas.height = w * size;

        cols = size;
        rows = size;

        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
                let cell = new Cell(i, j);
                grid.push(cell);
            }
        }

        current = grid[0];
        start = grid[0];
        end = grid[grid.length - 1];

        draw();

        generateBtn.disabled = false;
        solveBtn.disabled = true;
        statusText.textContent = "Ready to generate.";
    }

    class Cell {
        constructor(i, j) {
            this.i = i;
            this.j = j;
            this.walls = [true, true, true, true]; // Top, Right, Bottom, Left
            this.visited = false; // For generation

            // For A*
            this.f = 0;
            this.g = 0;
            this.h = 0;
            this.previous = undefined;
        }

        checkNeighbors() {
            let neighbors = [];

            let top = grid[index(this.i, this.j - 1)];
            let right = grid[index(this.i + 1, this.j)];
            let bottom = grid[index(this.i, this.j + 1)];
            let left = grid[index(this.i - 1, this.j)];

            if (top && !top.visited) neighbors.push(top);
            if (right && !right.visited) neighbors.push(right);
            if (bottom && !bottom.visited) neighbors.push(bottom);
            if (left && !left.visited) neighbors.push(left);

            if (neighbors.length > 0) {
                let r = Math.floor(Math.random() * neighbors.length);
                return neighbors[r];
            } else {
                return undefined;
            }
        }

        // Returns neighbors that are accessible (no wall in between)
        getAccessibleNeighbors() {
            let neighbors = [];

            let top = grid[index(this.i, this.j - 1)];
            let right = grid[index(this.i + 1, this.j)];
            let bottom = grid[index(this.i, this.j + 1)];
            let left = grid[index(this.i - 1, this.j)];

            if (top && !this.walls[0]) neighbors.push(top);
            if (right && !this.walls[1]) neighbors.push(right);
            if (bottom && !this.walls[2]) neighbors.push(bottom);
            if (left && !this.walls[3]) neighbors.push(left);

            return neighbors;
        }

        show() {
            let x = this.i * w;
            let y = this.j * w;

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;

            if (this.walls[0]) { // Top
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + w, y);
                ctx.stroke();
            }
            if (this.walls[1]) { // Right
                ctx.beginPath();
                ctx.moveTo(x + w, y);
                ctx.lineTo(x + w, y + w);
                ctx.stroke();
            }
            if (this.walls[2]) { // Bottom
                ctx.beginPath();
                ctx.moveTo(x + w, y + w);
                ctx.lineTo(x, y + w);
                ctx.stroke();
            }
            if (this.walls[3]) { // Left
                ctx.beginPath();
                ctx.moveTo(x, y + w);
                ctx.lineTo(x, y);
                ctx.stroke();
            }

            if (this.visited) {
                ctx.fillStyle = "#2a2a2a"; // Visited cell color
                ctx.fillRect(x, y, w, w);
            }
        }

        highlight(color) {
            let x = this.i * w;
            let y = this.j * w;
            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y + 2, w - 4, w - 4);
        }
    }

    function index(i, j) {
        if (i < 0 || j < 0 || i > cols - 1 || j > rows - 1) {
            return -1;
        }
        return i + j * cols;
    }

    function removeWalls(a, b) {
        let x = a.i - b.i;
        if (x === 1) {
            a.walls[3] = false;
            b.walls[1] = false;
        } else if (x === -1) {
            a.walls[1] = false;
            b.walls[3] = false;
        }
        let y = a.j - b.j;
        if (y === 1) {
            a.walls[0] = false;
            b.walls[2] = false;
        } else if (y === -1) {
            a.walls[2] = false;
            b.walls[0] = false;
        }
    }

    function generateStep() {
        // Speed control: execute multiple steps per frame if needed
        let steps = Math.floor(speedSlider.value / 10) + 1;

        for (let k = 0; k < steps; k++) {
            current.visited = true;
            let next = current.checkNeighbors();
            if (next) {
                next.visited = true;
                stack.push(current);
                removeWalls(current, next);
                current = next;
            } else if (stack.length > 0) {
                current = stack.pop();
            } else {
                // Done
                isGenerating = false;
                statusText.textContent = "Maze Generated. Ready to solve.";
                solveBtn.disabled = false;
                generateBtn.disabled = true;
                draw(); // Final draw
                return;
            }
        }

        draw();

        if (isGenerating) {
            animationId = requestAnimationFrame(generateStep);
        }
    }

    // Heuristic for A* (Manhattan distance)
    function heuristic(a, b) {
        return Math.abs(a.i - b.i) + Math.abs(a.j - b.j);
    }

    function solveStep() {
        let steps = Math.floor(speedSlider.value / 20) + 1;

        for (let k = 0; k < steps; k++) {
            if (openSet.length > 0) {
                let winner = 0;
                for (let i = 0; i < openSet.length; i++) {
                    if (openSet[i].f < openSet[winner].f) {
                        winner = i;
                    }
                }

                let currentSolve = openSet[winner];

                if (currentSolve === end) {
                    // Find the path
                    solutionPath = [];
                    let temp = currentSolve;
                    solutionPath.push(temp);
                    while (temp.previous) {
                        solutionPath.push(temp.previous);
                        temp = temp.previous;
                    }
                    isSolving = false;
                    statusText.textContent = "Maze Solved!";
                    draw();
                    return;
                }

                openSet.splice(winner, 1);
                closedSet.push(currentSolve);

                let neighbors = currentSolve.getAccessibleNeighbors();

                for (let i = 0; i < neighbors.length; i++) {
                    let neighbor = neighbors[i];

                    if (!closedSet.includes(neighbor)) {
                        let tempG = currentSolve.g + 1;

                        let newPath = false;
                        if (openSet.includes(neighbor)) {
                            if (tempG < neighbor.g) {
                                neighbor.g = tempG;
                                newPath = true;
                            }
                        } else {
                            neighbor.g = tempG;
                            newPath = true;
                            openSet.push(neighbor);
                        }

                        if (newPath) {
                            neighbor.h = heuristic(neighbor, end);
                            neighbor.f = neighbor.g + neighbor.h;
                            neighbor.previous = currentSolve;
                        }
                    }
                }
            } else {
                // No solution
                isSolving = false;
                statusText.textContent = "No solution found.";
                draw();
                return;
            }
        }

        draw();

        if (isSolving) {
            animationId = requestAnimationFrame(solveStep);
        }
    }

    function draw() {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < grid.length; i++) {
            grid[i].show();
        }

        // Highlight start and end
        if (start) start.highlight("#00ff00"); // Green
        if (end) end.highlight("#ff0000"); // Red

        if (isGenerating) {
            current.highlight("#0000ff"); // Blue head
        }

        if (isSolving) {
            // Draw open and closed sets
            for (let i = 0; i < closedSet.length; i++) {
                closedSet[i].highlight("#440000"); // Dark red visited
            }
            for (let i = 0; i < openSet.length; i++) {
                openSet[i].highlight("#004400"); // Dark green options
            }
        }

        // Draw path
        if (solutionPath.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = "#bb86fc"; // Purple path
            ctx.lineWidth = w / 2;
            ctx.moveTo(solutionPath[0].i * w + w/2, solutionPath[0].j * w + w/2);
            for (let i = 1; i < solutionPath.length; i++) {
                ctx.lineTo(solutionPath[i].i * w + w/2, solutionPath[i].j * w + w/2);
            }
            ctx.stroke();
        }
    }

    // Event Listeners
    generateBtn.addEventListener('click', () => {
        if (isGenerating || isSolving) return;

        // Reset grid visited state but keep walls? No, reset everything for new generation
        // Or keep size?
        // Actually, if we want to regenerate, we should reset the grid structure.
        // If we just want to reset the maze to empty, we call setup().

        setup(); // Clear everything

        isGenerating = true;
        statusText.textContent = "Generating maze...";
        generateBtn.disabled = true;
        solveBtn.disabled = true;

        generateStep();
    });

    solveBtn.addEventListener('click', () => {
        if (isGenerating || isSolving) return;

        isSolving = true;
        statusText.textContent = "Solving maze...";
        solveBtn.disabled = true;

        // Setup A*
        openSet = [];
        closedSet = [];
        solutionPath = [];

        // Reset previous pointers
        for(let i=0; i<grid.length; i++) {
            grid[i].previous = undefined;
            grid[i].g = 0;
            grid[i].h = 0;
            grid[i].f = 0;
        }

        openSet.push(start);

        solveStep();
    });

    resetBtn.addEventListener('click', () => {
        setup();
    });

    sizeSlider.addEventListener('input', () => {
        sizeValue.textContent = sizeSlider.value;
        setup();
    });

    // Initial setup
    setup();
});
