document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');

  // Basic Controls
  const countSlider = document.getElementById('particle-count');
  const countDisplay = document.getElementById('count-display');
  const sizeSlider = document.getElementById('particle-size');
  const sizeDisplay = document.getElementById('size-display');
  const speedSlider = document.getElementById('speed-control');
  const speedDisplay = document.getElementById('speed-display');
  const restartButton = document.getElementById('restart-button');

  // Advanced Controls
  const shapeSelect = document.getElementById('shape-select');
  const diffusionSlider = document.getElementById('diffusion-slider');
  const diffusionDisplay = document.getElementById('diffusion-display');
  const decaySelect = document.getElementById('decay-select');
  const bounceToggle = document.getElementById('bounce-toggle');

  let particles = [];

  // Simulation Parameters
  let particleCount = countSlider.value;
  let baseParticleSize = sizeSlider.value;
  let simulationSpeed = speedSlider.value;
  let particleShape = shapeSelect.value;
  let diffusionFactor = diffusionSlider.value;
  let decayType = decaySelect.value;
  let bounceEnabled = bounceToggle.checked;

  function resizeCanvas() {
    const controls = document.getElementById('controls');
    const controlsHeight = controls.offsetHeight;
    const headerHeight = document.querySelector('header').offsetHeight;
    const footerHeight = document.querySelector('footer').offsetHeight;

    canvas.width = window.innerWidth * 0.8;
    const availableHeight = window.innerHeight - headerHeight - footerHeight - controlsHeight - 60; // 60px for margins/paddings
    canvas.height = Math.max(200, availableHeight);
  }

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.baseSize = Math.random() * baseParticleSize + 1;
      this.size = this.baseSize;
      this.speedX = (Math.random() * 2 - 1);
      this.speedY = (Math.random() * 2 - 1);
      this.shape = particleShape;
    }

    update() {
      // Diffusion
      this.x += (Math.random() - 0.5) * diffusionFactor;
      this.y += (Math.random() - 0.5) * diffusionFactor;

      // Movement
      this.x += this.speedX * simulationSpeed;
      this.y += this.speedY * simulationSpeed;

      // Decay
      if (decayType === 'linear' && this.size > 0.2) {
        this.size -= 0.05;
      }

      if (this.size <= 0.2) {
        this.reset();
      }

      // Wall collision
      if (bounceEnabled) {
        if (this.x - this.size < 0 || this.x + this.size > canvas.width) {
          this.speedX *= -1;
        }
        if (this.y - this.size < 0 || this.y + this.size > canvas.height) {
          this.speedY *= -1;
        }
      } else { // Wrap around
        if (this.x + this.size < 0) this.x = canvas.width + this.size;
        if (this.x - this.size > canvas.width) this.x = -this.size;
        if (this.y + this.size < 0) this.y = canvas.height + this.size;
        if (this.y - this.size > canvas.height) this.y = -this.size;
      }
    }

    draw() {
      ctx.fillStyle = '#bb86fc';
      ctx.beginPath();
      switch(this.shape) {
        case 'circle':
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          break;
        case 'square':
          ctx.rect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
          break;
        case 'triangle':
          const side = this.size * 1.5;
          ctx.moveTo(this.x, this.y - side / Math.sqrt(3));
          ctx.lineTo(this.x - side / 2, this.y + side / (2 * Math.sqrt(3)));
          ctx.lineTo(this.x + side / 2, this.y + side / (2 * Math.sqrt(3)));
          ctx.closePath();
          break;
      }
      ctx.fill();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.baseSize = Math.random() * baseParticleSize + 1;
        this.size = this.baseSize;
        this.speedX = (Math.random() * 2 - 1);
        this.speedY = (Math.random() * 2 - 1);
    }
  }

  function init() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
  }

  function restartSimulation() {
    resizeCanvas();
    init();
  }

  let animationFrameId;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    animationFrameId = requestAnimationFrame(animate);
  }

  // Event Listeners
  countSlider.addEventListener('input', (e) => {
    particleCount = e.target.value;
    countDisplay.textContent = particleCount;
  });
  countSlider.addEventListener('change', restartSimulation);

  sizeSlider.addEventListener('input', (e) => {
    baseParticleSize = e.target.value;
    sizeDisplay.textContent = baseParticleSize;
  });
  sizeSlider.addEventListener('change', restartSimulation);

  speedSlider.addEventListener('input', (e) => {
    simulationSpeed = e.target.value;
    speedDisplay.textContent = `${parseFloat(simulationSpeed).toFixed(1)}x`;
  });

  shapeSelect.addEventListener('change', (e) => {
    particleShape = e.target.value;
    restartSimulation();
  });

  diffusionSlider.addEventListener('input', (e) => {
    diffusionFactor = e.target.value;
    diffusionDisplay.textContent = parseFloat(diffusionFactor).toFixed(1);
  });

  decaySelect.addEventListener('change', (e) => {
    decayType = e.target.value;
    restartSimulation();
  });

  bounceToggle.addEventListener('change', (e) => {
    bounceEnabled = e.target.checked;
  });

  restartButton.addEventListener('click', restartSimulation);
  window.addEventListener('resize', restartSimulation);

  // Initial Setup
  countDisplay.textContent = particleCount;
  sizeDisplay.textContent = baseParticleSize;
  speedDisplay.textContent = `${parseFloat(simulationSpeed).toFixed(1)}x`;
  diffusionDisplay.textContent = parseFloat(diffusionFactor).toFixed(1);

  restartSimulation();
  cancelAnimationFrame(animationFrameId);
  animate();
});