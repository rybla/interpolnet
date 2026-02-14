const playBtn = document.getElementById('play-btn');
const tempoSlider = document.getElementById('tempo-slider');
const bpmDisplay = document.getElementById('bpm-display');
const clearBtn = document.getElementById('clear-btn');
const grid = document.getElementById('grid');

const ROWS = 4;
const COLS = 16;
let bpm = 120;
let isPlaying = false;
let currentStep = 0;
let nextNoteTime = 0.0;
let timerID;
let lookahead = 25.0; // ms
let scheduleAheadTime = 0.1; // s

// 4 tracks: Kick, Snare, Hi-Hat, Clap
const tracks = [
    new Array(COLS).fill(false),
    new Array(COLS).fill(false),
    new Array(COLS).fill(false),
    new Array(COLS).fill(false)
];

let audioCtx;

// Initialize Grid
function initGrid() {
    grid.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const pad = document.createElement('div');
            pad.classList.add('pad');
            pad.dataset.row = r;
            pad.dataset.col = c;
            pad.addEventListener('click', () => togglePad(r, c, pad));
            grid.appendChild(pad);
        }
    }
}

function togglePad(r, c, el) {
    tracks[r][c] = !tracks[r][c];
    el.classList.toggle('active');
}

// Audio Context
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Synthesizer Functions
function playSound(trackIndex, time) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (trackIndex === 0) { // Kick
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gainNode.gain.setValueAtTime(1, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.start(time);
        osc.stop(time + 0.5);
    } else if (trackIndex === 1) { // Snare
        // Noise
        const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 sec
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        noise.connect(noiseFilter);
        noiseFilter.connect(gainNode);

        // Tone
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, time);
        gainNode.gain.setValueAtTime(0.7, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
        noise.start(time);
        noise.stop(time + 0.2);
    } else if (trackIndex === 2) { // Hi-Hat
        // High frequency noise
        const bufferSize = audioCtx.sampleRate * 0.1;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 10000;

        const highpass = audioCtx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 7000;

        noise.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(gainNode);

        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        noise.start(time);
        noise.stop(time + 0.05);
    } else if (trackIndex === 3) { // Clap
         // Short burst of noise with envelope
        const bufferSize = audioCtx.sampleRate * 0.2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = 1;

        noise.connect(filter);
        filter.connect(gainNode);

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.5, time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        noise.start(time);
        noise.stop(time + 0.15);
    }
}

// Scheduler
function nextNote() {
    const secondsPerBeat = 60.0 / bpm;
    const secondsPer16th = secondsPerBeat / 4; // 16th notes
    nextNoteTime += secondsPer16th;
    currentStep++;
    if (currentStep === COLS) {
        currentStep = 0;
    }
}

function scheduleVisual(step, time) {
    const delay = Math.max(0, (time - audioCtx.currentTime) * 1000);
    setTimeout(() => {
        updateVisuals(step);
    }, delay);
}

function scheduleNoteWithVisual(beatNumber, time) {
    for (let i = 0; i < ROWS; i++) {
        if (tracks[i][beatNumber]) {
            playSound(i, time);
        }
    }
    scheduleVisual(beatNumber, time);
}

function schedulerWithVisual() {
     while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNoteWithVisual(currentStep, nextNoteTime);
        nextNote();
    }
    if (isPlaying) {
        timerID = setTimeout(schedulerWithVisual, lookahead);
    }
}

function updateVisuals(step) {
    if (!isPlaying) return;

    // Clear previous
    document.querySelectorAll('.pad.playing').forEach(el => el.classList.remove('playing'));

    // Highlight current column
    for (let r = 0; r < ROWS; r++) {
        const pad = grid.children[r * COLS + step];
        if (pad) pad.classList.add('playing');
    }
}

// Controls
playBtn.addEventListener('click', () => {
    initAudio();
    isPlaying = !isPlaying;

    if (isPlaying) {
        currentStep = 0;
        nextNoteTime = audioCtx.currentTime + 0.1; // mild delay to start
        schedulerWithVisual();
        playBtn.textContent = 'Stop';
        playBtn.classList.add('active');
    } else {
        clearTimeout(timerID);
        playBtn.textContent = 'Play';
        playBtn.classList.remove('active');
        document.querySelectorAll('.pad.playing').forEach(el => el.classList.remove('playing'));
    }
});

tempoSlider.addEventListener('input', (e) => {
    bpm = parseInt(e.target.value);
    bpmDisplay.textContent = bpm;
});

clearBtn.addEventListener('click', () => {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            tracks[r][c] = false;
            const pad = grid.children[r * COLS + c];
            if (pad) pad.classList.remove('active');
        }
    }
});

// Init
initGrid();
