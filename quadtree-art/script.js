document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const dropZone = document.getElementById('drop-zone');
    const overlay = document.getElementById('overlay');
    const fileInput = document.getElementById('file-input');
    const thresholdInput = document.getElementById('threshold');
    const thresholdVal = document.getElementById('threshold-val');
    const maxDepthInput = document.getElementById('max-depth');
    const maxDepthVal = document.getElementById('max-depth-val');
    const showGridInput = document.getElementById('show-grid');
    const fillRectsInput = document.getElementById('fill-rects');
    const exportBtn = document.getElementById('export-btn');

    // Stats elements
    const pixelCountEl = document.getElementById('pixel-count');
    const nodeCountEl = document.getElementById('node-count');
    const compressionRatioEl = document.getElementById('compression-ratio');

    let integralImage = null;
    let originalImage = null; // Image object

    // Default image size limit to prevent freezing on huge images
    const MAX_WIDTH = 1024;
    const MAX_HEIGHT = 1024;

    // --- Integral Image Class ---
    class IntegralImage {
        constructor(imageData) {
            this.width = imageData.width;
            this.height = imageData.height;

            const count = this.width * this.height;
            this.sumR = new Float64Array(count);
            this.sumG = new Float64Array(count);
            this.sumB = new Float64Array(count);
            this.sumSqR = new Float64Array(count);
            this.sumSqG = new Float64Array(count);
            this.sumSqB = new Float64Array(count);

            this.compute(imageData.data);
        }

        compute(data) {
            let idx = 0;
            for (let y = 0; y < this.height; y++) {
                let rowSumR = 0, rowSumG = 0, rowSumB = 0;
                let rowSumSqR = 0, rowSumSqG = 0, rowSumSqB = 0;

                for (let x = 0; x < this.width; x++) {
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    // Alpha is ignored for calculation, assumed 255 for simplicity or just carrying color

                    rowSumR += r;
                    rowSumG += g;
                    rowSumB += b;

                    rowSumSqR += r * r;
                    rowSumSqG += g * g;
                    rowSumSqB += b * b;

                    const currentIdx = y * this.width + x;
                    const prevRowIdx = (y - 1) * this.width + x;

                    if (y === 0) {
                        this.sumR[currentIdx] = rowSumR;
                        this.sumG[currentIdx] = rowSumG;
                        this.sumB[currentIdx] = rowSumB;
                        this.sumSqR[currentIdx] = rowSumSqR;
                        this.sumSqG[currentIdx] = rowSumSqG;
                        this.sumSqB[currentIdx] = rowSumSqB;
                    } else {
                        this.sumR[currentIdx] = rowSumR + this.sumR[prevRowIdx];
                        this.sumG[currentIdx] = rowSumG + this.sumG[prevRowIdx];
                        this.sumB[currentIdx] = rowSumB + this.sumB[prevRowIdx];
                        this.sumSqR[currentIdx] = rowSumSqR + this.sumSqR[prevRowIdx];
                        this.sumSqG[currentIdx] = rowSumSqG + this.sumSqG[prevRowIdx];
                        this.sumSqB[currentIdx] = rowSumSqB + this.sumSqB[prevRowIdx];
                    }

                    idx += 4;
                }
            }
        }

        getStats(x, y, w, h) {
            // Ensure integer coordinates
            x = Math.floor(x);
            y = Math.floor(y);
            w = Math.floor(w);
            h = Math.floor(h);

            if (w <= 0 || h <= 0) return { r: 0, g: 0, b: 0, error: 0 };

            const x0 = x - 1;
            const y0 = y - 1;
            const x1 = x + w - 1;
            const y1 = y + h - 1;

            const A = (x0 < 0 || y0 < 0) ? 0 : y0 * this.width + x0;
            const B = (y0 < 0) ? 0 : y0 * this.width + x1;
            const C = (x0 < 0) ? 0 : y1 * this.width + x0;
            const D = y1 * this.width + x1;

            const term = (arr, idx) => (idx < 0 || idx >= arr.length) ? 0 : arr[idx];
            // Sum = D - B - C + A
            const calcSum = (arr) => {
                const valD = term(arr, D);
                const valB = (y0 < 0) ? 0 : term(arr, B);
                const valC = (x0 < 0) ? 0 : term(arr, C);
                const valA = (x0 < 0 || y0 < 0) ? 0 : term(arr, A);
                return valD - valB - valC + valA;
            };

            const sR = calcSum(this.sumR);
            const sG = calcSum(this.sumG);
            const sB = calcSum(this.sumB);

            const sSqR = calcSum(this.sumSqR);
            const sSqG = calcSum(this.sumSqG);
            const sSqB = calcSum(this.sumSqB);

            const area = w * h;
            const meanR = sR / area;
            const meanG = sG / area;
            const meanB = sB / area;

            // Variance = E[X^2] - (E[X])^2
            const varR = (sSqR / area) - (meanR * meanR);
            const varG = (sSqG / area) - (meanG * meanG);
            const varB = (sSqB / area) - (meanB * meanB);

            // Total error metric: sum of variances or max variance
            const error = varR + varG + varB;

            return {
                r: meanR,
                g: meanG,
                b: meanB,
                error: error
            };
        }
    }

    // --- Quadtree Processing ---

    function processQuadtree(x, y, w, h, threshold, maxDepth, currentDepth, nodes) {
        if (w <= 0 || h <= 0) return;

        const stats = integralImage.getStats(x, y, w, h);

        // Leaf conditions:
        // 1. Single pixel
        // 2. Error within threshold
        // 3. Max depth reached
        if ((w === 1 && h === 1) ||
            (stats.error <= threshold * threshold * 3) ||
            (currentDepth >= maxDepth)) {
            nodes.push({ x, y, w, h, r: stats.r, g: stats.g, b: stats.b });
            return;
        }

        // Determine split axes
        const splitX = w > 1;
        const splitY = h > 1;

        const halfW = splitX ? Math.floor(w / 2) : w;
        const halfH = splitY ? Math.floor(h / 2) : h;

        if (splitX && splitY) {
            processQuadtree(x, y, halfW, halfH, threshold, maxDepth, currentDepth + 1, nodes);
            processQuadtree(x + halfW, y, w - halfW, halfH, threshold, maxDepth, currentDepth + 1, nodes);
            processQuadtree(x, y + halfH, halfW, h - halfH, threshold, maxDepth, currentDepth + 1, nodes);
            processQuadtree(x + halfW, y + halfH, w - halfW, h - halfH, threshold, maxDepth, currentDepth + 1, nodes);
        } else if (splitX) {
            processQuadtree(x, y, halfW, h, threshold, maxDepth, currentDepth + 1, nodes);
            processQuadtree(x + halfW, y, w - halfW, h, threshold, maxDepth, currentDepth + 1, nodes);
        } else if (splitY) {
            processQuadtree(x, y, w, halfH, threshold, maxDepth, currentDepth + 1, nodes);
            processQuadtree(x, y + halfH, w, h - halfH, threshold, maxDepth, currentDepth + 1, nodes);
        }
    }

    function render() {
        if (!integralImage) return;

        const threshold = parseInt(thresholdInput.value);
        const maxDepth = parseInt(maxDepthInput.value);
        const showGrid = showGridInput.checked;
        const fillRects = fillRectsInput.checked;

        const nodes = [];
        processQuadtree(0, 0, canvas.width, canvas.height, threshold, maxDepth, 0, nodes);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Sort by size (largest first) to minimize overdraw artifacts?
        // No, just draw.

        let nodeCount = 0;

        nodes.forEach(node => {
            if (fillRects) {
                ctx.fillStyle = `rgb(${node.r}, ${node.g}, ${node.b})`;
                // Use a slight overlap to prevent sub-pixel gaps
                ctx.fillRect(node.x, node.y, node.w + 0.5, node.h + 0.5);
            }

            if (showGrid) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(node.x, node.y, node.w, node.h);
            }
            nodeCount++;
        });

        // Stats
        nodeCountEl.textContent = nodeCount.toLocaleString();
        const totalPixels = canvas.width * canvas.height;
        pixelCountEl.textContent = totalPixels.toLocaleString();

        const compression = 100 * (1 - (nodeCount / totalPixels));
        compressionRatioEl.textContent = compression.toFixed(2) + '%';
    }

    // --- Image Loading ---

    function handleImage(file) {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;

                // Resize if too big
                let w = img.width;
                let h = img.height;
                if (w > MAX_WIDTH || h > MAX_HEIGHT) {
                    const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
                    w *= ratio;
                    h *= ratio;
                }

                canvas.width = w;
                canvas.height = h;

                // Draw to canvas to get data
                ctx.drawImage(img, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);

                // Initialize Integral Image
                integralImage = new IntegralImage(imageData);

                // Hide overlay
                overlay.classList.add('hidden');
                exportBtn.disabled = false;

                // Initial render
                render();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // --- Event Listeners ---

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4CAF50';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#555';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#555';
        if (e.dataTransfer.files.length > 0) {
            handleImage(e.dataTransfer.files[0]);
        }
    });

    // Click to upload
    overlay.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImage(e.target.files[0]);
        }
    });

    // Controls
    thresholdInput.addEventListener('input', (e) => {
        thresholdVal.textContent = e.target.value;
        requestAnimationFrame(render);
    });

    maxDepthInput.addEventListener('input', (e) => {
        maxDepthVal.textContent = e.target.value;
        requestAnimationFrame(render);
    });

    showGridInput.addEventListener('change', () => {
        requestAnimationFrame(render);
    });

    fillRectsInput.addEventListener('change', () => {
        requestAnimationFrame(render);
    });

    // Export
    exportBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'quadtree-art.png';
        link.href = canvas.toDataURL();
        link.click();
    });
});
