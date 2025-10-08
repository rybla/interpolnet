document.addEventListener('DOMContentLoaded', () => {
    const fsmSelect = document.getElementById('fsm-select');
    const startBtn = document.getElementById('start-btn');
    const stepBtn = document.getElementById('step-btn');
    const networkContainer = document.getElementById('fsm-network');
    const inputSequenceContainer = document.getElementById('input-sequence');

    let currentState, currentInputIndex, fsm, network, animationInterval;
    let nodes, edges;

    const fsms = {
        'traffic-light': {
            initial: 'Red',
            sequence: ['TIMER', 'TIMER', 'TIMER', 'TIMER'],
            states: {
                'Red': { transitions: { 'TIMER': 'Green' } },
                'Green': { transitions: { 'TIMER': 'Yellow' } },
                'Yellow': { transitions: { 'TIMER': 'Red' } }
            }
        },
        'turnstile': {
            initial: 'Locked',
            sequence: ['COIN', 'PUSH', 'COIN', 'COIN', 'PUSH', 'PUSH'],
            states: {
                'Locked': { transitions: { 'COIN': 'Unlocked' } },
                'Unlocked': { transitions: { 'PUSH': 'Locked' } }
            }
        },
        'vending-machine': {
            initial: 'Idle',
            sequence: ['INSERT_COIN', 'INSERT_COIN', 'SELECT_ITEM', 'TAKE_ITEM', 'INSERT_COIN', 'SELECT_ITEM'],
            states: {
                'Idle': { transitions: { 'INSERT_COIN': 'Accepting' } },
                'Accepting': { transitions: { 'SELECT_ITEM': 'Dispensing' } },
                'Dispensing': { transitions: { 'TAKE_ITEM': 'Idle' } }
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
        currentInputIndex = 0;

        const stateNames = Object.keys(fsm.states);
        const nodeData = stateNames.map(id => ({ id, label: id }));
        const edgeData = [];
        for (const fromState in fsm.states) {
            for (const action in fsm.states[fromState].transitions) {
                const toState = fsm.states[fromState].transitions[action];
                edgeData.push({ from: fromState, to: toState, label: action, arrows: 'to' });
            }
        }

        nodes = new vis.DataSet(nodeData);
        edges = new vis.DataSet(edgeData);

        const data = { nodes, edges };
        const options = {
            nodes: {
                shape: 'circle',
                font: { size: 20, color: '#3b2a1a' },
                color: {
                    background: '#fdf5e6',
                    border: '#8b4513',
                    highlight: { background: '#ffdead', border: '#a0522d' }
                },
                borderWidth: 2
            },
            edges: {
                font: { align: 'top' },
                color: '#8b4513'
            },
            physics: {
                solver: 'forceAtlas2Based',
                stabilization: { iterations: 1000 }
            }
        };

        if (network) network.destroy();
        network = new vis.Network(networkContainer, data, options);

        renderInputSequence();
        updateUI();
    }

    function renderInputSequence() {
        inputSequenceContainer.innerHTML = '';
        fsm.sequence.forEach((input, index) => {
            const item = document.createElement('div');
            item.className = 'input-item';
            item.id = `input-${index}`;
            item.textContent = input;
            inputSequenceContainer.appendChild(item);
        });
    }

    function updateUI() {
        // Highlight current state
        network.unselectAll();
        network.selectNodes([currentState]);

        // Highlight current input
        document.querySelectorAll('.input-item').forEach(item => item.classList.remove('current'));
        if (currentInputIndex < fsm.sequence.length) {
            const currentInputEl = document.getElementById(`input-${currentInputIndex}`);
            if (currentInputEl) currentInputEl.classList.add('current');
        }
    }

    function step() {
        if (currentInputIndex >= fsm.sequence.length) {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
            return;
        }

        const input = fsm.sequence[currentInputIndex];
    const fromState = currentState;
    const transitions = fsm.states[fromState].transitions;

    if (transitions && transitions[input]) {
            const toState = transitions[input];
            currentState = toState;

        const edge = edges.get({
            filter: item => item.from === fromState && item.to === toState && item.label === input
        })[0];

        if (edge) {
            // Animate edge
            edges.update({ id: edge.id, color: { color: '#ff0000' }, width: 4 });
            // Animate node
            nodes.update({ id: toState, size: 30 });

            setTimeout(() => {
                edges.update({ id: edge.id, color: { color: '#8b4513' }, width: 1 });
                nodes.update({ id: toState, size: 25 }); // Or original size
            }, 800);
        }
        }

        currentInputIndex++;
        updateUI();
    }

function resetSimulation() {
    currentState = fsm.initial;
    currentInputIndex = 0;
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    updateUI();
}

    function startAnimation() {
    resetSimulation();
        animationInterval = setInterval(step, 1500);
    }

    fsmSelect.addEventListener('change', (e) => renderFSM(e.target.value));
    startBtn.addEventListener('click', startAnimation);
    stepBtn.addEventListener('click', () => {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
        step();
    });

    populateDropdown();
    if (fsmSelect.options.length > 0) {
        renderFSM(fsmSelect.value);
    }
});