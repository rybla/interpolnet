const canvas = document.getElementById('cipher-canvas');
const ctx = canvas.getContext('2d');
const plaintextInput = document.getElementById('plaintext');
const keyInput = document.getElementById('key-input');
const cipherSelect = document.getElementById('cipher-select');
const ciphertextOutput = document.getElementById('ciphertext');

let text = '';
let key = 3;
let cipherType = 'caesar';

function init() {
    plaintextInput.addEventListener('input', update);
    keyInput.addEventListener('input', update);
    cipherSelect.addEventListener('change', update);
    window.addEventListener('resize', resizeCanvas);

    // Initial update
    resizeCanvas();
}

function resizeCanvas() {
    if (!canvas.parentElement) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    update();
}

function update() {
    // Filter to A-Z for simplicity in this demo
    // We keep spaces in the visualization potentially?
    // Standard Caesar usually ignores spaces or passes them through.
    // Let's strip non-alpha for the visualization core logic to keep it clean.
    const rawText = plaintextInput.value.toUpperCase();
    text = rawText.replace(/[^A-Z]/g, '');

    // Preserve format for output text, but only encrypt letters
    key = parseInt(keyInput.value) || 0;
    cipherType = cipherSelect.value;

    if (cipherType === 'caesar') {
        runCaesar(rawText);
    } else if (cipherType === 'railfence') {
        runRailFence(rawText);
    }
}

function runCaesar(rawText) {
    let result = '';
    // Normalize key to 0-25
    const shift = ((key % 26) + 26) % 26;

    for (let i = 0; i < rawText.length; i++) {
        const char = rawText[i];
        if (char >= 'A' && char <= 'Z') {
            const code = char.charCodeAt(0);
            const shifted = ((code - 65 + shift) % 26) + 65;
            result += String.fromCharCode(shifted);
        } else {
            result += char;
        }
    }
    ciphertextOutput.value = result;

    drawCaesar(shift);
}

function runRailFence(rawText) {
    // Rail Fence typically removes spaces, but we can process rawText if we want.
    // Standard implementations usually work on the block of text.
    // Let's stick to the filtered 'text' (only A-Z) for the main visualization and output,
    // or apply to full text?
    // Applying to full text with spaces is valid.

    const cleanText = rawText; // Use raw text including spaces?
    // Usually Rail Fence is more visual without spaces, but let's support spaces.

    if (key < 2) {
        ciphertextOutput.value = cleanText;
        drawRailFence(cleanText, []);
        return;
    }

    let fence = [];
    for (let i = 0; i < key; i++) fence.push(new Array(cleanText.length).fill(null));

    let row = 0;
    let down = false;

    for (let i = 0; i < cleanText.length; i++) {
        fence[row][i] = cleanText[i];
        if (row === 0 || row === key - 1) down = !down;
        row += down ? 1 : -1;
    }

    let result = '';
    for (let i = 0; i < key; i++) {
        for (let j = 0; j < cleanText.length; j++) {
            if (fence[i][j] !== null) result += fence[i][j];
        }
    }
    ciphertextOutput.value = result;

    drawRailFence(cleanText, fence);
}

function drawCaesar(shift) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radiusOuter = Math.min(cx, cy) - 50;
    const radiusInner = radiusOuter - 40;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px Roboto Mono';

    // Draw Outer Ring (Plaintext)
    for (let i = 0; i < 26; i++) {
        const angle = (i * 2 * Math.PI) / 26 - Math.PI / 2;
        const x = cx + radiusOuter * Math.cos(angle);
        const y = cy + radiusOuter * Math.sin(angle);

        ctx.fillStyle = '#e94560'; // Accent
        ctx.fillText(String.fromCharCode(65 + i), x, y);
    }

    // Draw Inner Ring (Ciphertext)
    // The inner ring represents the mapping. A maps to A+shift.
    // So under A (outer), we should see the shifted letter.
    // Wait. If shift is 1 (A->B). Under A, we want B.
    // So the inner ring should be rotated counter-clockwise?
    // Let's think.
    // Outer 'A' is at -90deg.
    // Inner 'B' (which corresponds to A) should be at -90deg.
    // Inner ring normally has A at -90deg.
    // So we need to rotate inner ring such that B is at -90deg.
    // B is normally at -90 + step.
    // So we rotate by -step.
    // Rotation = -shift * step.

    const angleStep = (2 * Math.PI) / 26;
    const rotation = -shift * angleStep;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    for (let i = 0; i < 26; i++) {
        const angle = (i * 2 * Math.PI) / 26 - Math.PI / 2;
        const x = cx + radiusInner * Math.cos(angle);
        const y = cy + radiusInner * Math.sin(angle);

        ctx.fillStyle = '#00fff5'; // Highlight
        ctx.fillText(String.fromCharCode(65 + i), x, y);
    }
    ctx.restore();

    // Draw lines for active characters
    // Get unique chars from text
    const uniqueChars = [...new Set(text.split(''))];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;

    uniqueChars.forEach(char => {
        const code = char.charCodeAt(0) - 65;
        if (code < 0 || code > 25) return;

        // Outer pos
        const angleOuter = (code * angleStep) - Math.PI / 2;
        const x1 = cx + (radiusOuter - 10) * Math.cos(angleOuter);
        const y1 = cy + (radiusOuter - 10) * Math.sin(angleOuter);

        // Inner pos (mapped char)
        // Mapped char is (code + shift) % 26
        // But on the rotated inner ring, the mapped char is physically aligned with outer char.
        // So we just draw a line radially inward.

        const x2 = cx + (radiusInner + 10) * Math.cos(angleOuter);
        const y2 = cy + (radiusInner + 10) * Math.sin(angleOuter);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(0, 255, 245, 0.5)';
        ctx.stroke();
    });

    // Center Label
    ctx.fillStyle = '#eaeaea';
    ctx.font = '14px Montserrat';
    ctx.fillText(`Shift: ${shift}`, cx, cy);
}

function drawRailFence(vizText, fence) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!vizText) return;

    // Limit visualization length
    const maxChars = 30;
    const displayLen = Math.min(vizText.length, maxChars);
    const padding = 30;

    // Calculate cell size
    const w = (canvas.width - padding * 2) / Math.max(displayLen, 1);
    const h = (canvas.height - padding * 2) / Math.max(key, 1);

    ctx.font = 'bold 14px Roboto Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw path
    ctx.beginPath();
    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 2;

    let row = 0;
    let down = false;
    let points = [];

    // Re-calculate positions for visualization
    let r = 0;
    let d = false;
    for (let i = 0; i < displayLen; i++) {
        const x = padding + i * w + w/2;
        const y = padding + r * h + h/2;
        points.push({x, y, char: vizText[i]});

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        if (r === 0 || r === key - 1) d = !d;
        r += d ? 1 : -1;
    }
    ctx.stroke();

    // Draw grid points/chars
    for (let i = 0; i < displayLen; i++) {
        const p = points[i];

        // Draw circle bg
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.min(w/3, 15), 0, Math.PI*2);
        ctx.fillStyle = '#16213e';
        ctx.fill();
        ctx.strokeStyle = '#e94560';
        ctx.stroke();

        ctx.fillStyle = '#00fff5';
        ctx.fillText(p.char, p.x, p.y);
    }

    if (vizText.length > maxChars) {
        ctx.fillStyle = '#888';
        ctx.textAlign = 'right';
        ctx.fillText('...', canvas.width - 10, canvas.height / 2);
    }
}

init();
