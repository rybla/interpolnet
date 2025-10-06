document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("sandbox");
  const ctx = canvas.getContext("2d");

  const sandBtn = document.getElementById("sand-btn");
  const waterBtn = document.getElementById("water-btn");
  const stoneBtn = document.getElementById("stone-btn");
  const plantBtn = document.getElementById("plant-btn");
  const oozeBtn = document.getElementById("ooze-btn");
  const steamBtn = document.getElementById("steam-btn");
  const lavaBtn = document.getElementById("lava-btn");
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
  const PLANT = 4;
  const OOZE = 5;
  const STEAM = 6;
  const LAVA = 7;

  const PARTICLE_COLORS = {
    [SAND]: "#f0e68c",
    [WATER]: "#1e90ff",
    [STONE]: "#808080",
    [PLANT]: "#228b22",
    [OOZE]: "#9acd32",
    [STEAM]: "#f5f5f5",
    [LAVA]: "#ff4500",
  };

  let grid = createGrid();
  let isPaused = false;
  let currentElement = SAND;
  let isMouseDown = false;
  let moved = new Array(GRID_WIDTH * GRID_HEIGHT).fill(false);

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

    moved.fill(false);

    // Update falling/heavy particles (bottom-up)
    for (let y = GRID_HEIGHT - 2; y >= 0; y--) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const index = getIndex(x, y);

            if (moved[index]) {
                continue;
            }

            const particle = grid[index];

            if (particle === EMPTY || particle === STONE) {
                continue;
            }

            if (particle === PLANT) {
                let destroyed = false;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;
                        const neighbor = getParticle(x + i, y + j);
                        if (neighbor === LAVA) {
                            if (Math.random() < 0.2) {
                                setParticle(x, y, EMPTY);
                                destroyed = true;
                                break;
                            }
                        }
                        if (neighbor === OOZE) {
                            if (Math.random() < 0.2) {
                                setParticle(x, y, OOZE);
                                destroyed = true;
                                break;
                            }
                        }
                    }
                    if (destroyed) break;
                }
                if (destroyed) continue;
                
                if (getParticle(x, y + 1) === STONE && Math.random() < 0.01) {
                    setParticle(x, y + 1, PLANT);
                    moved[getIndex(x, y + 1)] = true;
                }

                if (getParticle(x, y - 1) === EMPTY && Math.random() < 0.05) {
                    setParticle(x, y - 1, PLANT);
                    moved[getIndex(x, y - 1)] = true;
                }
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;
                        if (getParticle(x + i, y + j) === WATER) {
                            for (let k = -1; k <= 1; k++) {
                                for (let l = -1; l <= 1; l++) {
                                    if (k === 0 && l === 0) continue;
                                    if (getParticle(x + k, y + l) === EMPTY && Math.random() < 0.1) {
                                        setParticle(x + k, y + l, PLANT);
                                        moved[getIndex(x + k, y + l)] = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                continue; 
            }

            if (particle === SAND) {
                const below = getParticle(x, y + 1);
                if (below === OOZE) {
                } else if (below === EMPTY || below === WATER) {
                    setParticle(x, y, below);
                    setParticle(x, y + 1, SAND);
                    moved[getIndex(x, y + 1)] = true;
                } else {
                    const dir = Math.random() < 0.5 ? -1 : 1;
                    const belowLeft = getParticle(x - dir, y + 1);
                    if ((belowLeft === EMPTY || belowLeft === WATER) && belowLeft !== OOZE) {
                        setParticle(x, y, belowLeft);
                        setParticle(x - dir, y + 1, SAND);
                        moved[getIndex(x - dir, y + 1)] = true;
                    } else {
                        const belowRight = getParticle(x + dir, y + 1);
                        if ((belowRight === EMPTY || belowRight === WATER) && belowRight !== OOZE) {
                            setParticle(x, y, belowRight);
                            setParticle(x + dir, y + 1, SAND);
                            moved[getIndex(x + dir, y + 1)] = true;
                        }
                    }
                }
            } else if (particle === WATER) {
                const below = getParticle(x, y + 1);
                if (below === EMPTY) {
                    setParticle(x, y, EMPTY);
                    setParticle(x, y + 1, WATER);
                    moved[getIndex(x, y + 1)] = true;
                } else {
                    const dir = Math.random() < 0.5 ? -1 : 1;
                    const side1 = getParticle(x + dir, y);
                    if (side1 === EMPTY) {
                        setParticle(x, y, EMPTY);
                        setParticle(x + dir, y, WATER);
                        moved[getIndex(x + dir, y)] = true;
                    } else {
                        const side2 = getParticle(x - dir, y);
                        if (side2 === EMPTY) {
                            setParticle(x, y, EMPTY);
                            setParticle(x - dir, y, WATER);
                            moved[getIndex(x - dir, y)] = true;
                        }
                    }
                }
            } else if (particle === LAVA) {
                let reacted = false;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;
                        const neighbor = getParticle(x + i, y + j);
                        const neighborIndex = getIndex(x + i, y + j);
                        if (neighbor === WATER) {
                            setParticle(x, y, STONE);
                            setParticle(x + i, y + j, STEAM);
                            moved[neighborIndex] = true;
                            reacted = true;
                            break;
                        }
                        if (neighbor === PLANT || neighbor === OOZE) {
                            if (Math.random() < 0.5) {
                                setParticle(x + i, y + j, STEAM);
                                moved[neighborIndex] = true;
                            }
                        }
                        if (neighbor === SAND) {
                            if (Math.random() < 0.2) {
                                setParticle(x + i, y + j, STONE);
                                moved[neighborIndex] = true;
                            }
                        }
                    }
                    if (reacted) break;
                }
                if (reacted) continue;

                if (Math.random() < 0.2) {
                    const below = getParticle(x, y + 1);
                    if (below === EMPTY || below === WATER) {
                        setParticle(x, y, below);
                        setParticle(x, y + 1, LAVA);
                        moved[getIndex(x, y + 1)] = true;
                    } else {
                        const dir = Math.random() < 0.5 ? -1 : 1;
                        const side = getParticle(x + dir, y);
                        if (side === EMPTY || side === WATER) {
                            setParticle(x, y, side);
                            setParticle(x + dir, y, LAVA);
                            moved[getIndex(x + dir, y)] = true;
                        }
                    }
                }
            } else if (particle === OOZE) {
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;
                        if (getParticle(x + i, y + j) === PLANT) {
                            if (Math.random() < 0.2) {
                                setParticle(x + i, y + j, OOZE);
                                moved[getIndex(x + i, y + j)] = true;
                            }
                        }
                    }
                }

                if (Math.random() < 0.1) {
                    const below = getParticle(x, y + 1);
                    if (below === EMPTY) {
                        setParticle(x, y, EMPTY);
                        setParticle(x, y + 1, OOZE);
                        moved[getIndex(x, y + 1)] = true;
                    } else {
                        const dir = Math.random() < 0.5 ? -1 : 1;
                        const side = getParticle(x + dir, y);
                        if (side === EMPTY) {
                            setParticle(x, y, EMPTY);
                            setParticle(x + dir, y, OOZE);
                            moved[getIndex(x + dir, y)] = true;
                        }
                    }
                }
            }
        }
    }

    // Update rising particles (top-down)
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const index = getIndex(x, y);
            if (moved[index]) continue;

            const particle = grid[index];
            if (particle === STEAM) {
                if (y === 0) {
                    setParticle(x, y, EMPTY);
                    continue;
                }
                
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;
                        if (getParticle(x + i, y + j) === PLANT) {
                            if (Math.random() < 0.2) {
                                setParticle(x + i, y + j, EMPTY);
                                moved[getIndex(x + i, y + j)] = true;
                            }
                        }
                    }
                }

                const above = getParticle(x, y - 1);
                if (above === EMPTY) {
                    setParticle(x, y, EMPTY);
                    setParticle(x, y - 1, STEAM);
                    moved[getIndex(x, y - 1)] = true;
                } else {
                    const dir = Math.random() < 0.5 ? -1 : 1;
                    const side1 = getParticle(x + dir, y);
                    if (side1 === EMPTY) {
                        setParticle(x, y, EMPTY);
                        setParticle(x + dir, y, STEAM);
                        moved[getIndex(x + dir, y)] = true;
                    } else {
                        const side2 = getParticle(x - dir, y);
                        if (side2 === EMPTY) {
                            setParticle(x, y, EMPTY);
                            setParticle(x - dir, y, STEAM);
                            moved[getIndex(x - dir, y)] = true;
                        }
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
    [sandBtn, waterBtn, stoneBtn, plantBtn, oozeBtn, steamBtn, lavaBtn, eraserBtn].forEach((btn) =>
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

  plantBtn.addEventListener("click", () => {
    currentElement = PLANT;
    setActiveButton(plantBtn);
  });

  oozeBtn.addEventListener("click", () => {
    currentElement = OOZE;
    setActiveButton(oozeBtn);
  });

  steamBtn.addEventListener("click", () => {
    currentElement = STEAM;
    setActiveButton(steamBtn);
  });

  lavaBtn.addEventListener("click", () => {
    currentElement = LAVA;
    setActiveButton(lavaBtn);
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