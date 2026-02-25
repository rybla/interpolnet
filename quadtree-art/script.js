const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const thresholdInput = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const showLinesInput = document.getElementById('showLines');
const nodeCountDisplay = document.getElementById('nodeCount');
const loading = document.getElementById('loading');

// Configuration
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

// State
let imgData = null; // { width, height, data }
let integralImages = null; // { r, g, b, r2, g2, b2 }
let rootNode = null;
let originalImage = null;

// Initialization
window.addEventListener('load', () => {
    createDefaultImage();
});

imageInput.addEventListener('change', handleImageUpload);
thresholdInput.addEventListener('input', (e) => {
    thresholdValue.textContent = e.target.value;
    updateTree();
});
showLinesInput.addEventListener('change', draw);

// Drag and drop support
document.body.addEventListener('dragover', (e) => e.preventDefault());
document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
    }
});

function handleImageUpload(e) {
    if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
    }
}

function processFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => processImage(img);
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function createDefaultImage() {
    const w = 512;
    const h = 512;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');

    // Draw a colorful pattern
    const grad = offCtx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#e94560');
    grad.addColorStop(0.5, '#0f3460');
    grad.addColorStop(1, '#16213e');
    offCtx.fillStyle = grad;
    offCtx.fillRect(0, 0, w, h);

    // Add some circles
    for (let i = 0; i < 20; i++) {
        offCtx.beginPath();
        offCtx.arc(
            Math.random() * w,
            Math.random() * h,
            Math.random() * 100 + 20,
            0,
            Math.PI * 2
        );
        offCtx.fillStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.5)`;
        offCtx.fill();
    }

    // Add text
    offCtx.font = 'bold 60px sans-serif';
    offCtx.fillStyle = 'rgba(255,255,255,0.8)';
    offCtx.textAlign = 'center';
    offCtx.fillText("Interpolnet", w/2, h/2);

    const img = new Image();
    img.onload = () => processImage(img);
    img.src = offCanvas.toDataURL();
}

function processImage(img) {
    loading.classList.remove('hidden');

    // Resize image to fit constraints while maintaining aspect ratio
    let w = img.width;
    let h = img.height;

    if (w > MAX_WIDTH || h > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
        w = Math.floor(w * ratio);
        h = Math.floor(h * ratio);
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, w, h);
    imgData = {
        width: w,
        height: h,
        data: imageData.data
    };

    // Compute integral images
    computeIntegralImages();

    // Build tree
    updateTree();

    loading.classList.add('hidden');
}

function computeIntegralImages() {
    const w = imgData.width;
    const h = imgData.height;
    const data = imgData.data;

    // Create arrays (Float64 to avoid overflow with squares)
    const size = w * h;
    const r = new Float64Array(size);
    const g = new Float64Array(size);
    const b = new Float64Array(size);
    const r2 = new Float64Array(size);
    const g2 = new Float64Array(size);
    const b2 = new Float64Array(size);

    for (let y = 0; y < h; y++) {
        let rowR = 0, rowG = 0, rowB = 0;
        let rowR2 = 0, rowG2 = 0, rowB2 = 0;

        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const valR = data[idx];
            const valG = data[idx + 1];
            const valB = data[idx + 2];

            rowR += valR;
            rowG += valG;
            rowB += valB;

            rowR2 += valR * valR;
            rowG2 += valG * valG;
            rowB2 += valB * valB;

            const prevY = (y > 0) ? (y - 1) * w + x : -1;

            const arrIdx = y * w + x;

            r[arrIdx] = rowR + (prevY >= 0 ? r[prevY] : 0);
            g[arrIdx] = rowG + (prevY >= 0 ? g[prevY] : 0);
            b[arrIdx] = rowB + (prevY >= 0 ? b[prevY] : 0);

            r2[arrIdx] = rowR2 + (prevY >= 0 ? r2[prevY] : 0);
            g2[arrIdx] = rowG2 + (prevY >= 0 ? g2[prevY] : 0);
            b2[arrIdx] = rowB2 + (prevY >= 0 ? b2[prevY] : 0);
        }
    }

    integralImages = { r, g, b, r2, g2, b2, width: w };
}

function getSum(arr, x, y, w, h, width) {
    const x0 = x - 1;
    const y0 = y - 1;
    const x1 = x + w - 1;
    const y1 = y + h - 1;

    const A = (x0 >= 0 && y0 >= 0) ? arr[y0 * width + x0] : 0;
    const B = (y0 >= 0) ? arr[y0 * width + x1] : 0;
    const C = (x0 >= 0) ? arr[y1 * width + x0] : 0;
    const D = arr[y1 * width + x1];

    return D - B - C + A;
}

function getRegionStats(x, y, w, h) {
    const area = w * h;
    if (area <= 0) return { r: 0, g: 0, b: 0, error: 0 };

    const width = integralImages.width;

    const sumR = getSum(integralImages.r, x, y, w, h, width);
    const sumG = getSum(integralImages.g, x, y, w, h, width);
    const sumB = getSum(integralImages.b, x, y, w, h, width);

    const sumR2 = getSum(integralImages.r2, x, y, w, h, width);
    const sumG2 = getSum(integralImages.g2, x, y, w, h, width);
    const sumB2 = getSum(integralImages.b2, x, y, w, h, width);

    const meanR = sumR / area;
    const meanG = sumG / area;
    const meanB = sumB / area;

    // Variance = E[X^2] - (E[X])^2
    const varR = (sumR2 / area) - (meanR * meanR);
    const varG = (sumG2 / area) - (meanG * meanG);
    const varB = (sumB2 / area) - (meanB * meanB);

    // Total error metric: sum of variances
    // Ensure non-negative (floating point errors can make it slightly negative)
    const error = Math.max(0, varR) + Math.max(0, varG) + Math.max(0, varB);

    return {
        r: Math.round(meanR),
        g: Math.round(meanG),
        b: Math.round(meanB),
        error: error
    };
}

function updateTree() {
    if (!integralImages) return;

    const threshold = parseInt(thresholdInput.value);
    // Threshold is 0-255. Error is variance sum.
    // Variance for one channel can be up to 255*255/4 approx 16000.
    // Sum can be 48000.
    // Map slider 0-255 to a useful error range.
    // A linear mapping might be too sensitive at low end.
    // Let's try squaring the threshold or scaling it up.
    // 0 -> 0
    // 10 -> 100
    // 255 -> ~65000
    const errorThreshold = threshold * threshold;

    rootNode = buildQuadtree(0, 0, imgData.width, imgData.height, errorThreshold);
    draw();

    // Count nodes
    const count = countNodes(rootNode);
    nodeCountDisplay.textContent = count;
}

function buildQuadtree(x, y, w, h, threshold) {
    const stats = getRegionStats(x, y, w, h);

    const node = {
        x, y, w, h,
        color: `rgb(${stats.r},${stats.g},${stats.b})`,
        children: null
    };

    // Stop if error is low enough or we hit pixel limit
    if (stats.error <= threshold || w <= 1 || h <= 1) {
        return node;
    }

    // Split
    const w1 = Math.floor(w / 2);
    const h1 = Math.floor(h / 2);
    const w2 = w - w1;
    const h2 = h - h1;

    // If we can't split further (should be caught by w<=1 check but safety first)
    if (w1 === 0 && h1 === 0) return node;

    node.children = [];

    // Top-Left
    if (w1 > 0 && h1 > 0)
        node.children.push(buildQuadtree(x, y, w1, h1, threshold));

    // Top-Right
    if (w2 > 0 && h1 > 0)
        node.children.push(buildQuadtree(x + w1, y, w2, h1, threshold));

    // Bottom-Left
    if (w1 > 0 && h2 > 0)
        node.children.push(buildQuadtree(x, y + h1, w1, h2, threshold));

    // Bottom-Right
    if (w2 > 0 && h2 > 0)
        node.children.push(buildQuadtree(x + w1, y + h1, w2, h2, threshold));

    return node;
}

function countNodes(node) {
    if (!node) return 0;
    if (!node.children) return 1;
    let sum = 0;
    for (const child of node.children) {
        sum += countNodes(child);
    }
    return sum; // +1 if we count internal nodes? usually count leaves (rectangles drawn)
}

function draw() {
    if (!rootNode) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const showLines = showLinesInput.checked;

    drawNode(rootNode, showLines);
}

function drawNode(node, showLines) {
    if (!node.children) {
        // Leaf
        ctx.fillStyle = node.color;
        ctx.fillRect(node.x, node.y, node.w, node.h);

        if (showLines) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(node.x, node.y, node.w, node.h);
        }
    } else {
        // Internal
        for (const child of node.children) {
            drawNode(child, showLines);
        }
    }
}
