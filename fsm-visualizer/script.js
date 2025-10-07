document.addEventListener('DOMContentLoaded', () => {
    const fsmSelect = document.getElementById('fsm-select');
    const startBtn = document.getElementById('start-btn');
    const stepBtn = document.getElementById('step-btn');
    const visualizationContainer = document.getElementById('visualization-container');

    let currentState, fsm, animationInterval;

    const fsms = {
        'traffic-light': {
            initial: 'Green',
            states: {
                'Green': { coords: { x: 350, y: 100 }, transitions: { 'TIMER': 'Yellow' } },
                'Yellow': { coords: { x: 350, y: 250 }, transitions: { 'TIMER': 'Red' } },
                'Red': { coords: { x: 350, y: 400 }, transitions: { 'TIMER': 'Green' } }
            }
        },
        'turnstile': {
            initial: 'Locked',
            states: {
                'Locked': { coords: { x: 200, y: 250 }, transitions: { 'COIN': 'Unlocked' } },
                'Unlocked': { coords: { x: 500, y: 250 }, transitions: { 'PUSH': 'Locked' } }
            }
        },
        'vending-machine': {
            initial: 'Idle',
            states: {
                'Idle': { coords: { x: 150, y: 150 }, transitions: { 'INSERT_COIN': 'Accepting' } },
                'Accepting': { coords: { x: 450, y: 150 }, transitions: { 'INSERT_COIN': 'Accepting', 'SELECT_ITEM': 'Dispensing' } },
                'Dispensing': { coords: { x: 450, y: 400 }, transitions: { 'TAKE_ITEM': 'Idle' } }
            }
        }
    };

    function populateDropdown() {
        for (const key in fsms) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            fsmSelect.appendChild(option);
        }
    }

    function renderFSM(name) {
        if (animationInterval) clearInterval(animationInterval);
        fsm = fsms[name];
        currentState = fsm.initial;

        const stateCoords = {};
        Object.keys(fsm.states).forEach(stateName => {
            stateCoords[stateName] = fsm.states[stateName].coords;
        });

        let svg = `<svg width="700" height="600">`;
        svg += `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8b4513" /></marker></defs>`;

        // Draw transitions
        Object.keys(fsm.states).forEach(stateName => {
            const fromCoords = stateCoords[stateName];
            for (const action in fsm.states[stateName].transitions) {
                const toState = fsm.states[stateName].transitions[action];
                const toCoords = stateCoords[toState];

                let pathId = `path-${stateName}-${toState}-${action}`.replace(/\s/g, '');
                let path;
                if (stateName === toState) { // Self-transition
                    path = `M ${fromCoords.x} ${fromCoords.y - 40} A 30 30 0 1 1 ${fromCoords.x + 1} ${fromCoords.y - 40}`;
                    svg += `<text x="${fromCoords.x}" y="${fromCoords.y - 80}" text-anchor="middle" fill="#3b2a1a">${action}</text>`;
                } else {
                    path = `M ${fromCoords.x} ${fromCoords.y} L ${toCoords.x} ${toCoords.y}`;
                    svg += `<text x="${(fromCoords.x + toCoords.x) / 2 + 15}" y="${(fromCoords.y + toCoords.y) / 2}" fill="#3b2a1a">${action}</text>`;
                }
                svg += `<path id="${pathId}" d="${path}" stroke="#8b4513" stroke-width="2" fill="none" marker-end="url(#arrow)" />`;
            }
        });

        // Draw states
        Object.keys(fsm.states).forEach(stateName => {
            const { x, y } = stateCoords[stateName];
            svg += `<g id="state-${stateName}" class="state-node">
                        <circle cx="${x}" cy="${y}" r="40" stroke="#3b2a1a" stroke-width="3" fill="#fdf5e6" />
                        <text x="${x}" y="${y}" dy=".3em" text-anchor="middle" fill="#3b2a1a" font-family="Uncial Antiqua">${stateName}</text>
                    </g>`;
        });

        svg += `</svg>`;
        visualizationContainer.innerHTML = svg;
        highlightState();
    }

    function highlightState() {
        document.querySelectorAll('.state-node circle').forEach(c => c.style.fill = '#fdf5e6');
        const activeNode = document.querySelector(`#state-${currentState} circle`);
        if (activeNode) activeNode.style.fill = '#ffdead';
    }

    function step() {
        const transitions = fsm.states[currentState].transitions;
        const actions = Object.keys(transitions);
        if (actions.length > 0) {
            const action = actions[Math.floor(Math.random() * actions.length)];
            const toState = transitions[action];
            animateTransition(currentState, toState, action, () => {
                currentState = toState;
                highlightState();
            });
        }
    }

    function startAnimation() {
        if (animationInterval) clearInterval(animationInterval);
        step(); // a first step
        animationInterval = setInterval(step, 2000);
    }

    function animateTransition(fromState, toState, action, callback) {
        const pathId = `path-${fromState}-${toState}-${action}`.replace(/\s/g, '');
        const path = document.getElementById(pathId);
        if (!path) {
            callback();
            return;
        }

        const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        particle.setAttribute('r', '5');
        particle.setAttribute('fill', '#8b4513');

        const animation = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
        animation.setAttribute('dur', '1s');
        animation.setAttribute('repeatCount', '1');
        animation.setAttribute('fill', 'freeze');
        animation.setAttribute('path', path.getAttribute('d'));

        particle.appendChild(animation);
        document.querySelector('svg').appendChild(particle);
        animation.beginElement();

        setTimeout(() => {
            particle.remove();
            callback();
        }, 1000);
    }

    fsmSelect.addEventListener('change', (e) => renderFSM(e.target.value));
    startBtn.addEventListener('click', startAnimation);
    stepBtn.addEventListener('click', () => {
        if (animationInterval) clearInterval(animationInterval);
        step();
    });

    populateDropdown();
    if (fsmSelect.options.length > 0) {
        renderFSM(fsmSelect.value);
    }
});