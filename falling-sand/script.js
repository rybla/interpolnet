document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("sandbox");
  const ctx = canvas.getContext("2d");

  const sandBtn = document.getElementById("sand-btn");
  const waterBtn = document.getElementById("water-btn");
  const stoneBtn = document.getElementById("stone-btn");
  const eraserBtn = document.getElementById("eraser-btn");
  const resetBtn = document.getElementById("reset-btn");
  const pauseBtn = document.getElementById("pause-btn");

  const PARTICLE_SIZE = 5;
  const GRID_WIDTH = canvas.width / PARTICLE_SIZE;
  const GRID_HEIGHT = canvas.height / PARTICLE_SIZE;

  const EMPTY = 0;
  const SAND = 1;
  const WATER = 2;
  const STONE = 3;

  const PARTICLE_COLORS = {
    [SAND]: "#f0e68c",
    [WATER]: "#1e90ff",
    [STONE]: "#808080",
  };

  let grid = createGrid();
  let isPaused = false;
  let currentElement = SAND;
  let isMouseDown = false;

  function createGrid() {
    return new Array(GRID_WIDTH * GRID_HEIGHT).fill(EMPTY);
  }

  function getIndex(x, y) {
    return y * GRID_WIDTH + x;
  }

  function setParticle(x, y, type) {
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      grid[getIndex(x, y)] = type;
    }
  }

  function getParticle(x, y) {
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      return grid[getIndex(x, y)];
    }
    return STONE; // Treat out-of-bounds as stone
  }

  function update() {
    if (isPaused) return;

    for (let y = GRID_HEIGHT - 2; y >= 0; y--) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const index = getIndex(x, y);
        const particle = grid[index];

        if (particle === EMPTY || particle === STONE) {
          continue;
        }

        if (particle === SAND) {
          const below = getParticle(x, y + 1);
          if (below === EMPTY || below === WATER) {
            setParticle(x, y, below);
            setParticle(x, y + 1, SAND);
          } else {
            const dir = Math.random() < 0.5 ? -1 : 1;
            const belowLeft = getParticle(x - dir, y + 1);
            const belowRight = getParticle(x + dir, y + 1);

            if (belowLeft === EMPTY || belowLeft === WATER) {
              setParticle(x, y, belowLeft);
              setParticle(x - dir, y + 1, SAND);
            } else if (belowRight === EMPTY || belowRight === WATER) {
              setParticle(x, y, belowRight);
              setParticle(x + dir, y + 1, SAND);
            }
          }
        } else if (particle === WATER) {
          const below = getParticle(x, y + 1);
           if (below === EMPTY) {
            setParticle(x, y, EMPTY);
            setParticle(x, y + 1, WATER);
          } else {
            const dir = Math.random() < 0.5 ? -1 : 1;
            const side1 = getParticle(x + dir, y);
            const side2 = getParticle(x - dir, y);

            if (side1 === EMPTY) {
                setParticle(x, y, EMPTY);
                setParticle(x + dir, y, WATER);
            } else if (side2 === EMPTY) {
                setParticle(x, y, EMPTY);
                setParticle(x - dir, y, WATER);
            }
          }
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const particle = getParticle(x, y);
        if (particle !== EMPTY) {
          ctx.fillStyle = PARTICLE_COLORS[particle];
          ctx.fillRect(
            x * PARTICLE_SIZE,
            y * PARTICLE_SIZE,
            PARTICLE_SIZE,
            PARTICLE_SIZE
          );
        }
      }
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function setActiveButton(button) {
    [sandBtn, waterBtn, stoneBtn, eraserBtn].forEach((btn) =>
      btn.classList.remove("active")
    );
    button.classList.add("active");
  }

  sandBtn.addEventListener("click", () => {
      currentElement = SAND;
      setActiveButton(sandBtn);
  });

  waterBtn.addEventListener("click", () => {
      currentElement = WATER;
      setActiveButton(waterBtn);
  });

  stoneBtn.addEventListener("click", () => {
      currentElement = STONE;
      setActiveButton(stoneBtn);
  });

  eraserBtn.addEventListener("click", () => {
      currentElement = EMPTY;
      setActiveButton(eraserBtn);
  });

  resetBtn.addEventListener("click", () => {
    grid = createGrid();
  });

  pauseBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  });

  canvas.addEventListener("mousedown", (e) => {
    isMouseDown = true;
    drawParticles(e);
  });

  canvas.addEventListener("mouseup", () => {
    isMouseDown = false;
  });

  canvas.addEventListener("mouseleave", () => {
    isMouseDown = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (isMouseDown) {
      drawParticles(e);
    }
  });

  function drawParticles(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / PARTICLE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / PARTICLE_SIZE);

    // Brush size
    const brushSize = 3;
    for (let i = -brushSize; i <= brushSize; i++) {
        for (let j = -brushSize; j <= brushSize; j++) {
            if (i*i + j*j < brushSize*brushSize) {
                 setParticle(x + i, y + j, currentElement);
            }
        }
    }
  }

  setActiveButton(sandBtn);
  loop();
});