const container = document.getElementById('visualizer-container');
const algorithmSelect = document.getElementById('algorithm-select');
const arraySizeInput = document.getElementById('array-size');
const arraySizeDisplay = document.getElementById('array-size-display');
const speedInput = document.getElementById('speed');
const generateBtn = document.getElementById('generate-btn');
const sortBtn = document.getElementById('sort-btn');

let array = [];
let bars = [];
let audioCtx = null;
let isSorting = false;
let abortController = null;

// Initialize Audio Context on user interaction
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playNote(value) {
    if (!audioCtx) return;

    // Resume context if suspended (browser policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // Map value (0-100) to frequency (200-800Hz)
    const frequency = 200 + (value / 100) * 600;

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

function generateArray() {
    const size = parseInt(arraySizeInput.value);
    array = [];
    container.innerHTML = '';
    bars = [];

    for (let i = 0; i < size; i++) {
        const value = Math.floor(Math.random() * 90) + 10; // 10 to 100
        array.push(value);

        const bar = document.createElement('div');
        bar.classList.add('bar');
        bar.style.height = `${value}%`;
        // Calculate width based on container width and number of bars
        // But CSS handles flex. We just need to set margins if needed.
        // Let's set a flexible width using flex-grow in CSS or just fixed % width?
        // Let's use JS to set width to fit.
        const width = 100 / size;
        bar.style.width = `calc(${width}% - 2px)`; // subtract margin

        container.appendChild(bar);
        bars.push(bar);
    }
}

function getDelay() {
    // Speed input 1-100. Delay should be inverted.
    // 1 -> 500ms, 100 -> 1ms
    const val = parseInt(speedInput.value);
    return Math.max(1, 500 - (val * 4.9)); // approx range
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check for abort signal
function checkAbort(signal) {
    if (signal && signal.aborted) {
        throw new Error('Sort aborted');
    }
}

async function swap(i, j, signal) {
    checkAbort(signal);

    bars[i].classList.add('swap');
    bars[j].classList.add('swap');

    // Play sound
    playNote(array[i]);
    playNote(array[j]);

    await sleep(getDelay());

    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;

    bars[i].style.height = `${array[i]}%`;
    bars[j].style.height = `${array[j]}%`;

    await sleep(getDelay());

    bars[i].classList.remove('swap');
    bars[j].classList.remove('swap');
}

async function compare(i, j, signal) {
    checkAbort(signal);

    bars[i].classList.add('compare');
    bars[j].classList.add('compare');

    playNote(array[i]);

    await sleep(getDelay());

    bars[i].classList.remove('compare');
    bars[j].classList.remove('compare');
}

// --- Sorting Algorithms ---

async function bubbleSort(signal) {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            await compare(j, j + 1, signal);
            if (array[j] > array[j + 1]) {
                await swap(j, j + 1, signal);
            }
        }
        bars[n - 1 - i].classList.add('sorted');
    }
    bars[0].classList.add('sorted');
}

async function selectionSort(signal) {
    const n = array.length;
    for (let i = 0; i < n; i++) {
        let minIdx = i;
        bars[i].classList.add('compare'); // Mark current position

        for (let j = i + 1; j < n; j++) {
            await compare(minIdx, j, signal);
            if (array[j] < array[minIdx]) {
                if (minIdx !== i) bars[minIdx].classList.remove('swap'); // Unmark old min
                minIdx = j;
                bars[minIdx].classList.add('swap'); // Mark new min temporarily
            }
        }

        if (minIdx !== i) {
            await swap(i, minIdx, signal);
            bars[minIdx].classList.remove('swap'); // Clear marker
        }
        bars[i].classList.remove('compare');
        bars[i].classList.add('sorted');
    }
}

async function insertionSort(signal) {
    const n = array.length;
    bars[0].classList.add('sorted'); // Conceptually sorted

    for (let i = 1; i < n; i++) {
        let key = array[i];
        let j = i - 1;

        // Visualize key selection
        bars[i].classList.add('swap');
        await sleep(getDelay());

        // While moving elements to the right
        while (j >= 0 && array[j] > key) {
            await compare(j, j + 1, signal); // Actually comparing key with array[j]

            // Move j to j+1
            array[j + 1] = array[j];
            bars[j + 1].style.height = `${array[j + 1]}%`;
            playNote(array[j]);

            j = j - 1;
            await sleep(getDelay());
        }
        array[j + 1] = key;
        bars[j + 1].style.height = `${key}%`;

        // Clear styles
        for(let k=0; k<=i; k++) bars[k].classList.remove('swap', 'compare');
        // Mark sorted range (not strictly accurate color-wise until end, but visual aid)
        for(let k=0; k<=i; k++) bars[k].classList.add('sorted');
    }
}

async function mergeSort(signal) {
    await mergeSortRecursive(0, array.length - 1, signal);
    // Mark all as sorted
    for(let i=0; i<array.length; i++) bars[i].classList.add('sorted');
}

async function mergeSortRecursive(start, end, signal) {
    checkAbort(signal);
    if (start >= end) return;

    const mid = Math.floor((start + end) / 2);
    await mergeSortRecursive(start, mid, signal);
    await mergeSortRecursive(mid + 1, end, signal);
    await merge(start, mid, end, signal);
}

async function merge(start, mid, end, signal) {
    let left = start;
    let right = mid + 1;
    let tempArray = [];

    // Visualize the range being merged
    for (let i = start; i <= end; i++) {
        bars[i].classList.add('compare');
    }
    await sleep(getDelay());

    while (left <= mid && right <= end) {
        checkAbort(signal);
        playNote(array[left]); // Sound feedback

        if (array[left] <= array[right]) {
            tempArray.push(array[left]);
            left++;
        } else {
            tempArray.push(array[right]);
            right++;
        }
    }

    while (left <= mid) {
        tempArray.push(array[left]);
        left++;
    }
    while (right <= end) {
        tempArray.push(array[right]);
        right++;
    }

    // Put back into array and visualize
    for (let i = 0; i < tempArray.length; i++) {
        checkAbort(signal);
        const index = start + i;
        array[index] = tempArray[i];
        bars[index].style.height = `${array[index]}%`;
        bars[index].classList.add('swap');
        playNote(array[index]);
        await sleep(getDelay());
        bars[index].classList.remove('swap');
    }

    // Clear compare
    for (let i = start; i <= end; i++) {
        bars[i].classList.remove('compare');
    }
}

async function quickSort(signal) {
    await quickSortRecursive(0, array.length - 1, signal);
    // Mark all as sorted
    for(let i=0; i<array.length; i++) bars[i].classList.add('sorted');
}

async function quickSortRecursive(low, high, signal) {
    checkAbort(signal);
    if (low < high) {
        const pi = await partition(low, high, signal);
        await quickSortRecursive(low, pi - 1, signal);
        await quickSortRecursive(pi + 1, high, signal);
    } else if (low >= 0 && high >= 0 && low === high) {
         // Single element is sorted relative to itself
    }
}

async function partition(low, high, signal) {
    const pivot = array[high];
    bars[high].classList.add('swap'); // Pivot color

    let i = (low - 1);

    for (let j = low; j <= high - 1; j++) {
        await compare(j, high, signal); // Compare with pivot

        if (array[j] < pivot) {
            i++;
            await swap(i, j, signal);
        }
    }
    await swap(i + 1, high, signal);
    bars[high].classList.remove('swap'); // Remove pivot color from original position (now swapped)
    bars[i+1].classList.add('sorted'); // Pivot is now in correct place
    return i + 1;
}

// --- Event Listeners ---

arraySizeInput.addEventListener('input', () => {
    arraySizeDisplay.textContent = arraySizeInput.value;
    if (!isSorting) generateArray();
});

generateBtn.addEventListener('click', () => {
    if (isSorting) {
        // Should not happen if button disabled, but just in case
        return;
    }
    generateArray();
});

sortBtn.addEventListener('click', async () => {
    if (isSorting) return;

    initAudio();
    isSorting = true;

    // Disable controls
    generateBtn.disabled = true;
    sortBtn.disabled = true;
    arraySizeInput.disabled = true;
    algorithmSelect.disabled = true;

    // Remove sorted class from previous run
    bars.forEach(bar => bar.classList.remove('sorted'));

    abortController = new AbortController();
    const signal = abortController.signal;
    const algo = algorithmSelect.value;

    try {
        if (algo === 'bubble') await bubbleSort(signal);
        else if (algo === 'selection') await selectionSort(signal);
        else if (algo === 'insertion') await insertionSort(signal);
        else if (algo === 'merge') await mergeSort(signal);
        else if (algo === 'quick') await quickSort(signal);
    } catch (e) {
        if (e.message === 'Sort aborted') {
            console.log('Sorting aborted');
        } else {
            console.error(e);
        }
    } finally {
        isSorting = false;
        generateBtn.disabled = false;
        sortBtn.disabled = false;
        arraySizeInput.disabled = false;
        algorithmSelect.disabled = false;
        abortController = null;
    }
});

// Initial generation
generateArray();
