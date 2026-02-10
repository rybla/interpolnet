const container = document.getElementById('visualizer-container');
const sizeSlider = document.getElementById('array-size');
const speedSlider = document.getElementById('speed');
const algorithmSelect = document.getElementById('algorithm-select');
const generateBtn = document.getElementById('generate-btn');
const sortBtn = document.getElementById('sort-btn');

let array = [];
let isSorting = false;
let audioCtx = null;

// Audio Context Initialization
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playNote(freq) {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

// Utility
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getSpeed() {
    // Invert speed: higher value = lower delay
    // range 1-100. delay = 1000 / value?
    // or delay = (101 - value) * factor
    return (101 - parseInt(speedSlider.value)) * 2;
}

// Array Generation
function generateArray() {
    if (isSorting) return;
    container.innerHTML = '';
    array = [];
    const size = parseInt(sizeSlider.value);

    for (let i = 0; i < size; i++) {
        array.push(Math.floor(Math.random() * 100) + 5);
    }

    renderArray();
}

function renderArray() {
    container.innerHTML = '';
    const width = container.clientWidth;
    const barWidth = Math.max(2, Math.floor(width / array.length) - 2);

    array.forEach((value, index) => {
        const bar = document.createElement('div');
        bar.classList.add('bar');
        bar.style.height = `${value * 3}px`;
        bar.style.width = `${barWidth}px`;
        bar.id = `bar-${index}`;
        container.appendChild(bar);
    });
}

// Sorting Algorithms

async function swap(i, j) {
    const bars = document.querySelectorAll('.bar');
    bars[i].style.backgroundColor = '#f1c40f'; // Swap color
    bars[j].style.backgroundColor = '#f1c40f';

    await sleep(getSpeed());

    let temp = array[i];
    array[i] = array[j];
    array[j] = temp;

    bars[i].style.height = `${array[i] * 3}px`;
    bars[j].style.height = `${array[j] * 3}px`;

    playNote(200 + array[i] * 5);
    playNote(200 + array[j] * 5);

    await sleep(getSpeed());

    bars[i].style.backgroundColor = '#3498db'; // Reset color
    bars[j].style.backgroundColor = '#3498db';
}

async function compare(i, j) {
    const bars = document.querySelectorAll('.bar');
    bars[i].style.backgroundColor = '#e74c3c'; // Compare color
    bars[j].style.backgroundColor = '#e74c3c';

    playNote(200 + array[i] * 5);

    await sleep(getSpeed());

    bars[i].style.backgroundColor = '#3498db'; // Reset color
    bars[j].style.backgroundColor = '#3498db';
}

async function bubbleSort() {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (!isSorting) return;
            await compare(j, j + 1);
            if (array[j] > array[j + 1]) {
                await swap(j, j + 1);
            }
        }
        document.getElementById(`bar-${n - 1 - i}`).style.backgroundColor = '#9b59b6'; // Sorted
    }
    document.getElementById(`bar-0`).style.backgroundColor = '#9b59b6';
}

async function selectionSort() {
    const n = array.length;
    for (let i = 0; i < n; i++) {
        let minIdx = i;
        for (let j = i + 1; j < n; j++) {
            if (!isSorting) return;
            await compare(minIdx, j);
            if (array[j] < array[minIdx]) {
                minIdx = j;
            }
        }
        if (minIdx !== i) {
            await swap(i, minIdx);
        }
        document.getElementById(`bar-${i}`).style.backgroundColor = '#9b59b6';
    }
}

async function insertionSort() {
    const n = array.length;
    for (let i = 1; i < n; i++) {
        let key = array[i];
        let j = i - 1;

        // Visualize key selection
        const bars = document.querySelectorAll('.bar');
        bars[i].style.backgroundColor = '#e67e22'; // Key color

        await sleep(getSpeed());

        while (j >= 0 && array[j] > key) {
            if (!isSorting) return;
            await compare(j, j + 1); // Comparing with key position (conceptually)

            array[j + 1] = array[j];
            bars[j + 1].style.height = `${array[j + 1] * 3}px`;
            bars[j + 1].style.backgroundColor = '#f1c40f'; // Shift

            playNote(200 + array[j] * 5);
            await sleep(getSpeed());

            bars[j + 1].style.backgroundColor = '#9b59b6'; // Part of sorted sub-array
            j = j - 1;
        }
        array[j + 1] = key;
        bars[j + 1].style.height = `${key * 3}px`;
        bars[j + 1].style.backgroundColor = '#9b59b6'; // Placed

        // Color all up to i as sorted
        for (let k = 0; k <= i; k++) {
            bars[k].style.backgroundColor = '#9b59b6';
        }
    }
}

async function mergeSort(start = 0, end = array.length - 1) {
    if (start >= end) return;
    if (!isSorting) return;

    const mid = Math.floor((start + end) / 2);
    await mergeSort(start, mid);
    await mergeSort(mid + 1, end);
    await merge(start, mid, end);
}

async function merge(start, mid, end) {
    if (!isSorting) return;

    let left = array.slice(start, mid + 1);
    let right = array.slice(mid + 1, end + 1);

    let i = 0, j = 0, k = start;
    const bars = document.querySelectorAll('.bar');

    while (i < left.length && j < right.length) {
        if (!isSorting) return;

        // Visualizing comparison isn't straightforward as indices map to temp arrays
        // But we can highlight k
        bars[k].style.backgroundColor = '#e74c3c';
        await sleep(getSpeed());

        if (left[i] <= right[j]) {
            array[k] = left[i];
            i++;
        } else {
            array[k] = right[j];
            j++;
        }

        bars[k].style.height = `${array[k] * 3}px`;
        bars[k].style.backgroundColor = '#9b59b6'; // Merged part
        playNote(200 + array[k] * 5);

        k++;
    }

    while (i < left.length) {
        if (!isSorting) return;
        array[k] = left[i];
        bars[k].style.height = `${array[k] * 3}px`;
        bars[k].style.backgroundColor = '#9b59b6';
        playNote(200 + array[k] * 5);
        await sleep(getSpeed());
        i++;
        k++;
    }

    while (j < right.length) {
        if (!isSorting) return;
        array[k] = right[j];
        bars[k].style.height = `${array[k] * 3}px`;
        bars[k].style.backgroundColor = '#9b59b6';
        playNote(200 + array[k] * 5);
        await sleep(getSpeed());
        j++;
        k++;
    }
}

async function quickSort(start = 0, end = array.length - 1) {
    if (start < end) {
        if (!isSorting) return;
        let pIndex = await partition(start, end);
        await quickSort(start, pIndex - 1);
        await quickSort(pIndex + 1, end);
    } else if (start >= 0 && end >= 0 && start < array.length && end < array.length) {
         document.getElementById(`bar-${start}`).style.backgroundColor = '#9b59b6';
    }
}

async function partition(start, end) {
    let pivot = array[end];
    let i = start - 1;
    const bars = document.querySelectorAll('.bar');

    bars[end].style.backgroundColor = '#e67e22'; // Pivot

    for (let j = start; j < end; j++) {
        if (!isSorting) return;

        bars[j].style.backgroundColor = '#e74c3c'; // Compare
        await sleep(getSpeed());

        if (array[j] < pivot) {
            i++;
            await swap(i, j);
            bars[i].style.backgroundColor = '#f39c12'; // Left partition
        } else {
             bars[j].style.backgroundColor = '#3498db'; // Right partition
        }
    }

    await swap(i + 1, end);
    bars[i + 1].style.backgroundColor = '#9b59b6'; // Pivot fixed

    // Reset colors in range
    for (let k = start; k <= end; k++) {
        if (k !== i + 1) bars[k].style.backgroundColor = '#3498db';
    }

    return i + 1;
}

// Event Listeners
generateBtn.addEventListener('click', () => {
    isSorting = false;
    generateArray();
});

sizeSlider.addEventListener('input', () => {
    isSorting = false;
    generateArray();
});

sortBtn.addEventListener('click', async () => {
    if (isSorting) return;
    initAudio();
    isSorting = true;
    generateBtn.disabled = true;
    sortBtn.disabled = true;
    sizeSlider.disabled = true;
    algorithmSelect.disabled = true;

    const algo = algorithmSelect.value;

    if (algo === 'bubble') await bubbleSort();
    else if (algo === 'selection') await selectionSort();
    else if (algo === 'insertion') await insertionSort();
    else if (algo === 'merge') await mergeSort();
    else if (algo === 'quick') {
        await quickSort();
        // Ensure all are purple at end of quicksort
        document.querySelectorAll('.bar').forEach(b => b.style.backgroundColor = '#9b59b6');
    }

    isSorting = false;
    generateBtn.disabled = false;
    sortBtn.disabled = false;
    sizeSlider.disabled = false;
    algorithmSelect.disabled = false;
});

// Init
generateArray();
