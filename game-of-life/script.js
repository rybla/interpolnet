document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game-of-life-canvas");
  const ctx = canvas.getContext("2d");

  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");
  const clearButton = document.getElementById("clear-button");
  const randomButton = document.getElementById("random-button");
  const speedSlider = document.getElementById("speed-slider");

  const resolution = 10;
  canvas.width = 800;
  canvas.height = 600;

  const COLS = canvas.width / resolution;
  const ROWS = canvas.height / resolution;

  let grid = buildGrid();
  let timeoutId = null;
  let speed = 1000 - speedSlider.value;

  function buildGrid() {
    return new Array(COLS)
      .fill(null)
      .map(() =>
        new Array(ROWS).fill(null).map(() => Math.floor(Math.random() * 2))
      );
  }

  function clearGrid() {
    return new Array(COLS)
      .fill(null)
      .map(() => new Array(ROWS).fill(0));
  }

  function drawGrid(grid) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let col = 0; col < grid.length; col++) {
      for (let row = 0; row < grid[col].length; row++) {
        const cell = grid[col][row];
        ctx.beginPath();
        ctx.rect(col * resolution, row * resolution, resolution, resolution);
        ctx.fillStyle = cell ? "black" : "white";
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function nextGen(grid) {
    const nextGrid = grid.map((arr) => [...arr]);

    for (let col = 0; col < grid.length; col++) {
      for (let row = 0; row < grid[col].length; row++) {
        const cell = grid[col][row];
        let numNeighbours = 0;
        for (let i = -1; i < 2; i++) {
          for (let j = -1; j < 2; j++) {
            if (i === 0 && j === 0) {
              continue;
            }
            const x_cell = col + i;
            const y_cell = row + j;

            if (x_cell >= 0 && y_cell >= 0 && x_cell < COLS && y_cell < ROWS) {
              const currentNeighbour = grid[col + i][row + j];
              numNeighbours += currentNeighbour;
            }
          }
        }

        // Rules
        if (cell === 1 && numNeighbours < 2) {
          nextGrid[col][row] = 0;
        } else if (cell === 1 && numNeighbours > 3) {
          nextGrid[col][row] = 0;
        } else if (cell === 0 && numNeighbours === 3) {
          nextGrid[col][row] = 1;
        }
      }
    }
    return nextGrid;
  }

  function update() {
    grid = nextGen(grid);
    drawGrid(grid);
    timeoutId = setTimeout(update, speed);
  }

  function stopGame() {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  function handleCanvasClick(event) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const col = Math.floor(x / resolution);
      const row = Math.floor(y / resolution);

      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
          grid[col][row] = grid[col][row] ? 0 : 1;
          drawGrid(grid);
      }
  }

  startButton.addEventListener("click", () => {
    if (timeoutId === null) {
        update();
    }
  });

  stopButton.addEventListener("click", stopGame);

  clearButton.addEventListener("click", () => {
    stopGame();
    grid = clearGrid();
    drawGrid(grid);
  });

  randomButton.addEventListener("click", () => {
    stopGame();
    grid = buildGrid();
    drawGrid(grid);
  });

  speedSlider.addEventListener('input', e => {
      speed = 1000 - e.target.value;
      if (timeoutId !== null) {
          stopGame();
          update();
      }
  });

  canvas.addEventListener("click", handleCanvasClick);

  // Initial draw
  drawGrid(grid);
});