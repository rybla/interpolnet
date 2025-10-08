document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('l-system-canvas');
    const ctx = canvas.getContext('2d');
    const lSystemSelect = document.getElementById('l-system-select');
    const startButton = document.getElementById('start-button');
    const stepButton = document.getElementById('step-button');
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    const generationsSlider = document.getElementById('generations-slider');
    const generationsValue = document.getElementById('generations-value');

    const presets = {
        sierpinski: {
            axiom: 'F-G-G',
            rules: { 'F': 'F-G+F+G-F', 'G': 'GG' },
            angle: 120, initialAngle: 0, length: 8, lengthFactor: 0.5,
            startX: 0.05, startY: 0.95, generations: 6
        },
        koch: {
            axiom: 'F',
            rules: { 'F': 'F+F-F-F+F' },
            angle: 90, initialAngle: 0, length: 5, lengthFactor: 0.33,
            startX: 0.05, startY: 0.95, generations: 4
        },
        dragon: {
            axiom: 'FX',
            rules: { 'X': 'X+YF+', 'Y': '-FX-Y' },
            angle: 90, initialAngle: 0, length: 10, lengthFactor: 0.75,
            startX: 0.3, startY: 0.5, generations: 10
        },
        plant: {
            axiom: 'X',
            rules: { 'X': 'F+[[X]-X]-F[-FX]+X', 'F': 'FF' },
            angle: 25, initialAngle: -70, length: 40, lengthFactor: 0.5,
            startX: 0.5, startY: 1.0, generations: 5
        }
    };

    let currentSystem;
    let currentGeneration = 0;
    let generationTimeoutId;

    function generate(system) {
        let nextAxiom = '';
        for (const char of system.axiom) {
            nextAxiom += system.rules[char] || char;
        }
        system.axiom = nextAxiom;
        system.length *= system.lengthFactor;
    }

    function draw(system, sequence) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#3b5998';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const stack = [];
        let x = system.startX * canvas.width;
        let y = system.startY * canvas.height;
        let angle = system.initialAngle * Math.PI / 180;

        for (const command of sequence) {
            switch (command) {
                case 'F': case 'G':
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    x += system.length * Math.cos(angle);
                    y += system.length * Math.sin(angle);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    break;
                case 'f':
                    x += system.length * Math.cos(angle);
                    y += system.length * Math.sin(angle);
                    break;
                case '+':
                    angle += system.angle * Math.PI / 180;
                    break;
                case '-':
                    angle -= system.angle * Math.PI / 180;
                    break;
                case '[':
                    stack.push({ x, y, angle });
                    break;
                case ']':
                    ({ x, y, angle } = stack.pop());
                    break;
            }
        }
    }

    function step() {
        clearTimeout(generationTimeoutId);
        if (currentGeneration < generationsSlider.value) {
            generate(currentSystem);
            currentGeneration++;
            draw(currentSystem, currentSystem.axiom);
        }
    }

    function start() {
        clearTimeout(generationTimeoutId);
        resetToPreset(lSystemSelect.value);

        step();

        function animateGenerations() {
            if (currentGeneration >= generationsSlider.value) {
                clearTimeout(generationTimeoutId);
                return;
            }
            step();
            const delay = 2200 - speedSlider.value;
            generationTimeoutId = setTimeout(animateGenerations, delay);
        }
        const initialDelay = 2200 - speedSlider.value;
        generationTimeoutId = setTimeout(animateGenerations, initialDelay);
    }

    function resetToPreset(presetName) {
        currentSystem = JSON.parse(JSON.stringify(presets[presetName]));
        currentSystem.name = presetName;
        currentGeneration = 0;

        generationsSlider.value = presets[presetName].generations;
        generationsValue.textContent = generationsSlider.value;

        draw(currentSystem, currentSystem.axiom);
    }

    speedSlider.addEventListener('input', () => {
        const delayInSeconds = (2200 - speedSlider.value) / 1000;
        speedValue.textContent = `${delayInSeconds.toFixed(1)}s`;
    });

    generationsSlider.addEventListener('input', () => {
        generationsValue.textContent = generationsSlider.value;
    });

    startButton.addEventListener('click', start);
    stepButton.addEventListener('click', step);
    lSystemSelect.addEventListener('change', () => {
        clearTimeout(generationTimeoutId);
        resetToPreset(lSystemSelect.value)
    });

    const initialDelay = (2200 - speedSlider.value) / 1000;
    speedValue.textContent = `${initialDelay.toFixed(1)}s`;
    resetToPreset(lSystemSelect.value);
});