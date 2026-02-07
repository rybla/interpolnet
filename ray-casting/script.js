// Retro Raycaster Engine

// Constants
const SCREEN_WIDTH = 320;
const SCREEN_HEIGHT = 200;
const FOV = 60 * (Math.PI / 180);
const MAX_DEPTH = 20; // Maximum ray distance
const MINIMAP_SCALE = 0.2;

// DOM Elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');

// Set canvas resolution (low res for retro feel)
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;

// Game State
let gameState = {
    running: false,
    lastTime: 0,
    player: {
        x: 3.5,
        y: 3.5,
        dir: 0, // Angle in radians
        speed: 3.0,
        rotSpeed: 2.0
    },
    keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        arrowup: false,
        arrowdown: false,
        arrowleft: false,
        arrowright: false
    }
};

// Map Representation (1 = Wall, 0 = Empty)
const mapSize = 16;
const worldMap = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Input Handling
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (gameState.keys.hasOwnProperty(key)) {
        gameState.keys[key] = true;
    }
    if (e.key === ' ' && !gameState.running) {
        start();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (gameState.keys.hasOwnProperty(key)) {
        gameState.keys[key] = false;
    }
});

// Click to start on the overlay
overlay.addEventListener('click', () => {
    if (!gameState.running) {
        start();
    }
});

function start() {
    gameState.running = true;
    overlay.classList.add('hidden');
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    const moveStep = gameState.player.speed * dt;
    const rotStep = gameState.player.rotSpeed * dt;

    // Rotation
    if (gameState.keys.arrowleft || gameState.keys.a) {
        gameState.player.dir -= rotStep;
    }
    if (gameState.keys.arrowright || gameState.keys.d) {
        gameState.player.dir += rotStep;
    }

    // Movement
    let newX = gameState.player.x;
    let newY = gameState.player.y;

    if (gameState.keys.arrowup || gameState.keys.w) {
        newX += Math.cos(gameState.player.dir) * moveStep;
        newY += Math.sin(gameState.player.dir) * moveStep;
    }
    if (gameState.keys.arrowdown || gameState.keys.s) {
        newX -= Math.cos(gameState.player.dir) * moveStep;
        newY -= Math.sin(gameState.player.dir) * moveStep;
    }

    // Simple Collision Detection
    // Check if the new position is inside a wall
    if (worldMap[Math.floor(newY)][Math.floor(newX)] === 0) {
        gameState.player.x = newX;
        gameState.player.y = newY;
    }
}

function render() {
    // Clear screen
    ctx.fillStyle = '#333'; // Ceiling color
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
    ctx.fillStyle = '#555'; // Floor color
    ctx.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2);

    // Raycasting Loop
    for (let x = 0; x < SCREEN_WIDTH; x++) {
        // Calculate ray position and direction
        const cameraX = 2 * x / SCREEN_WIDTH - 1; // x-coordinate in camera space
        const rayAngle = gameState.player.dir + Math.atan(cameraX * Math.tan(FOV / 2));

        const rayDirX = Math.cos(rayAngle);
        const rayDirY = Math.sin(rayAngle);

        // Which box of the map we're in
        let mapX = Math.floor(gameState.player.x);
        let mapY = Math.floor(gameState.player.y);

        // Length of ray from one x or y-side to next x or y-side
        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);

        let perpWallDist;

        // What direction to step in x or y-direction (either +1 or -1)
        let stepX, stepY;

        let sideDistX, sideDistY; // Length of ray from current position to next x or y-side

        // Calculate step and initial sideDist
        if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (gameState.player.x - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1.0 - gameState.player.x) * deltaDistX;
        }
        if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (gameState.player.y - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1.0 - gameState.player.y) * deltaDistY;
        }

        // DDA Analysis
        let hit = 0; // Was a wall hit?
        let side; // Was a NS or a EW wall hit?

        // Loop until we hit a wall or go too far
        let dist = 0;
        while (hit === 0 && dist < MAX_DEPTH) {
            // Jump to next map square, OR in x-direction, OR in y-direction
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }
            // Check if ray has hit a wall
            if (worldMap[mapY][mapX] > 0) hit = 1;

            // Safety break for infinite loops (though MAX_DEPTH logic should handle it)
             dist++; // crude distance check
        }


        // Calculate distance projected on camera direction (Euclidean distance will give fisheye effect!)
        if (side === 0) perpWallDist = (mapX - gameState.player.x + (1 - stepX) / 2) / rayDirX;
        else           perpWallDist = (mapY - gameState.player.y + (1 - stepY) / 2) / rayDirY;

        // Fix fisheye effect
        // The distance calculated above is the Euclidean distance from the player to the wall.
        // We need the perpendicular distance to the camera plane.
        const correctedDist = perpWallDist * Math.cos(rayAngle - gameState.player.dir);

        // Calculate height of line to draw on screen
        const lineHeight = Math.floor(SCREEN_HEIGHT / correctedDist);

        // Calculate lowest and highest pixel to fill in current stripe
        let drawStart = -lineHeight / 2 + SCREEN_HEIGHT / 2;
        if (drawStart < 0) drawStart = 0;
        let drawEnd = lineHeight / 2 + SCREEN_HEIGHT / 2;
        if (drawEnd >= SCREEN_HEIGHT) drawEnd = SCREEN_HEIGHT - 1;

        // Choose wall color
        let color = '#00ff00'; // Default green
        const wallType = worldMap[mapY][mapX];
        if (wallType === 1) color = '#aa0000'; // Red brick
        if (wallType === 2) color = '#0000aa'; // Blue brick

        // Give x and y sides different brightness
        if (side === 1) {
             // Dim the color slightly for side 1
             // Simple way: parse hex, reduce, repack. Or just use hsl.
             // Let's use hsl for simplicity in shading
             const hue = wallType === 1 ? 0 : 240;
             const lightness = 50 * 0.7; // Darker
             color = `hsl(${hue}, 100%, ${lightness}%)`;
        } else {
             const hue = wallType === 1 ? 0 : 240;
             color = `hsl(${hue}, 100%, 50%)`;
        }

        // Draw the pixels of the stripe as a vertical line
        ctx.fillStyle = color;
        ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
    }

    // Draw Minimap (optional, but helpful)
    drawMinimap();
}

function drawMinimap() {
    const mmSize = 64;
    const cellSize = mmSize / mapSize;
    const padding = 10;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(padding, padding, mmSize, mmSize);

    // Walls
    for(let y=0; y<mapSize; y++) {
        for(let x=0; x<mapSize; x++) {
            if(worldMap[y][x] > 0) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(padding + x*cellSize, padding + y*cellSize, cellSize, cellSize);
            }
        }
    }

    // Player
    ctx.fillStyle = '#f00';
    const px = padding + gameState.player.x * cellSize;
    const py = padding + gameState.player.y * cellSize;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();

    // View direction
    ctx.strokeStyle = '#f00';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(gameState.player.dir) * 8, py + Math.sin(gameState.player.dir) * 8);
    ctx.stroke();
}

function gameLoop(timestamp) {
    if (!gameState.running) return;

    if (!gameState.lastTime) gameState.lastTime = timestamp;

    // Calculate delta time in seconds, capped at 0.1s to prevent huge jumps
    let dt = (timestamp - gameState.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;

    gameState.lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// Initial render
render();
