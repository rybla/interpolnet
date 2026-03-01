document.addEventListener('DOMContentLoaded', () => {
    const tapeEl = document.getElementById('tape');
    const headStateEl = document.getElementById('head-state');
    const stepCountEl = document.getElementById('step-count');
    const currentStateDisplayEl = document.getElementById('current-state-display');
    const haltMessageEl = document.getElementById('halt-message');
    const rulesInput = document.getElementById('rules-input');

    const presetSelect = document.getElementById('preset-select');
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const btnStep = document.getElementById('btn-step');
    const btnReset = document.getElementById('btn-reset');
    const btnApplyRules = document.getElementById('btn-apply-rules');
    const speedSlider = document.getElementById('speed-slider');

    const CELL_WIDTH = 60; // Must match CSS .cell width
    const VISIBLE_CELLS = 21; // Odd number so there is a center

    let tape = {}; // index -> string symbol
    let headPosition = 0;
    let currentState = 'A';
    let stepCount = 0;
    let rules = {}; // { 'A,_': { newState: 'B', writeSymbol: '1', direction: 'R' } }

    let isPlaying = false;
    let playTimeout = null;
    let isHalted = false;

    // Presets
    const presets = {
        'busy-beaver-3': {
            initialState: 'A',
            initialTape: {},
            rulesText: `A _ B 1 R
A 1 H 1 R
B _ C 0 R
B 1 B 1 R
C _ C 1 L
C 1 A 1 L`
        },
        'binary-increment': {
            initialState: 'q0',
            // tape holding ..._ _ 1 0 1 1 _ _...
            initialTape: { '-1': '1', '0': '0', '1': '1', '2': '1' },
            rulesText: `q0 0 q0 0 R
q0 1 q0 1 R
q0 _ q1 _ L
q1 1 q1 0 L
q1 0 H 1 N
q1 _ H 1 N`
        },
        'palindrome': {
            initialState: 'q0',
            // tape holding 1 0 1 0 1 (palindrome)
            initialTape: { '0': '1', '1': '0', '2': '1', '3': '0', '4': '1' },
            rulesText: `q0 0 q1 _ R
q0 1 q2 _ R
q0 _ H _ N
q1 0 q1 0 R
q1 1 q1 1 R
q1 _ q3 _ L
q2 0 q2 0 R
q2 1 q2 1 R
q2 _ q4 _ L
q3 0 q5 _ L
q3 _ H _ N
q4 1 q5 _ L
q4 _ H _ N
q5 0 q5 0 L
q5 1 q5 1 L
q5 _ q0 _ R`
        },
        'custom': {
            initialState: 'A',
            initialTape: {},
            rulesText: `A _ B 1 R\nB 1 A 0 L`
        }
    };

    function parseRules(text) {
        const lines = text.split('\n');
        const newRules = {};
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('//') || line.startsWith('#')) continue;

            const parts = line.split(/\s+/);
            if (parts.length === 5) {
                const [state, readSym, newState, writeSym, dir] = parts;
                newRules[`${state},${readSym}`] = {
                    newState,
                    writeSymbol: writeSym,
                    direction: dir
                };
            }
        }
        return newRules;
    }

    function initMachine(presetKey) {
        stopPlay();
        const preset = presets[presetKey];
        if (!preset) return;

        rulesInput.value = preset.rulesText;
        rules = parseRules(preset.rulesText);

        tape = { ...preset.initialTape };
        headPosition = 0;
        currentState = preset.initialState;
        stepCount = 0;
        isHalted = false;

        updateUI();
    }

    function applyCustomRules() {
        stopPlay();
        rules = parseRules(rulesInput.value);
        tape = {}; // Keep it simple, reset tape on apply rules
        headPosition = 0;

        // Try to guess initial state from first rule
        const keys = Object.keys(rules);
        if (keys.length > 0) {
            currentState = keys[0].split(',')[0];
        } else {
            currentState = 'A';
        }

        stepCount = 0;
        isHalted = false;
        presetSelect.value = 'custom';
        updateUI();
    }

    function getTapeSymbol(index) {
        return tape[index] !== undefined ? tape[index] : '_';
    }

    function setTapeSymbol(index, symbol) {
        if (symbol === '_') {
            delete tape[index]; // clean up to prevent memory leak
        } else {
            tape[index] = symbol;
        }
    }

    function step() {
        if (isHalted) return;

        const currentSymbol = getTapeSymbol(headPosition);
        const ruleKey = `${currentState},${currentSymbol}`;
        const rule = rules[ruleKey];

        if (!rule) {
            // Implicit halt
            halt('Halted: No rule for state ' + currentState + ' reading ' + currentSymbol);
            return;
        }

        if (rule.newState === 'H' || rule.newState === 'HALT') {
            setTapeSymbol(headPosition, rule.writeSymbol);
            currentState = rule.newState;
            stepCount++;
            halt('Halted: Reached HALT state.');
            updateUI(true);
            return;
        }

        // Apply rule
        setTapeSymbol(headPosition, rule.writeSymbol);
        currentState = rule.newState;

        if (rule.direction === 'R') {
            headPosition++;
        } else if (rule.direction === 'L') {
            headPosition--;
        }
        // 'N' or other means stay

        stepCount++;
        updateUI(true);
    }

    function halt(msg) {
        isHalted = true;
        stopPlay();
        haltMessageEl.textContent = msg;
        if (msg.includes('No rule')) {
            haltMessageEl.classList.add('error');
        } else {
            haltMessageEl.classList.remove('error');
        }
        btnStep.disabled = true;
    }

    function play() {
        if (isHalted) return;
        isPlaying = true;
        btnPlay.disabled = true;
        btnPause.disabled = false;
        btnStep.disabled = true;

        function loop() {
            if (!isPlaying) return;
            step();
            if (!isHalted) {
                // calculate delay from slider (1 to 100) -> (1000ms to 10ms)
                const speed = speedSlider.value;
                const delay = 1010 - (speed * 10);
                playTimeout = setTimeout(loop, delay);
            }
        }
        loop();
    }

    function stopPlay() {
        isPlaying = false;
        clearTimeout(playTimeout);
        btnPlay.disabled = false;
        btnPause.disabled = true;
        btnStep.disabled = isHalted;
    }

    function updateUI(animated = false) {
        headStateEl.textContent = currentState;
        currentStateDisplayEl.textContent = currentState;
        stepCountEl.textContent = stepCount;

        if (!isHalted) {
            haltMessageEl.textContent = '';
            haltMessageEl.classList.remove('error');
        }

        renderTape(animated);
    }

    function renderTape(animated) {
        tapeEl.innerHTML = '';

        // We render a fixed number of cells around the head
        const halfVisible = Math.floor(VISIBLE_CELLS / 2);
        const startIndex = headPosition - halfVisible;
        const endIndex = headPosition + halfVisible;

        for (let i = startIndex; i <= endIndex; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (i === headPosition) {
                cell.classList.add('active');
                if (animated) cell.classList.add('updated');
            }

            const symbol = getTapeSymbol(i);
            cell.textContent = symbol;
            tapeEl.appendChild(cell);
        }
    }

    // Event Listeners
    btnPlay.addEventListener('click', play);
    btnPause.addEventListener('click', stopPlay);
    btnStep.addEventListener('click', step);

    btnReset.addEventListener('click', () => {
        initMachine(presetSelect.value);
    });

    btnApplyRules.addEventListener('click', applyCustomRules);

    presetSelect.addEventListener('change', (e) => {
        initMachine(e.target.value);
    });

    speedSlider.addEventListener('input', () => {
        // Just adjusts delay for next step
    });

    // Initialize
    initMachine('busy-beaver-3');
});
