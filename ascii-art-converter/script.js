const fileInput = document.getElementById('image-upload');
const webcamBtn = document.getElementById('webcam-btn');
const resolutionInput = document.getElementById('resolution');
const resolutionVal = document.getElementById('res-val');
const densityInput = document.getElementById('density');
const invertInput = document.getElementById('invert');
const asciiOutput = document.getElementById('ascii-output');

let currentImage = null;
let videoElement = document.createElement('video');
let isWebcamActive = false;
let animationFrameId;
let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d', { willReadFrequently: true });

// Setup
videoElement.autoplay = true;
videoElement.playsInline = true;

// Event Listeners
fileInput.addEventListener('change', handleImageUpload);
webcamBtn.addEventListener('click', toggleWebcam);
resolutionInput.addEventListener('input', () => {
    resolutionVal.textContent = resolutionInput.value;
    if (!isWebcamActive && currentImage) renderAscii();
});
densityInput.addEventListener('input', () => {
    if (!isWebcamActive && currentImage) renderAscii();
});
invertInput.addEventListener('change', () => {
    if (!isWebcamActive && currentImage) renderAscii();
});

// Drag and Drop
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleImageUpload(e) {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) return;

    stopWebcam();
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            renderAscii();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function toggleWebcam() {
    if (isWebcamActive) {
        stopWebcam();
        webcamBtn.textContent = "Start Webcam";
        asciiOutput.textContent = "Webcam stopped.";
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            videoElement.srcObject = stream;
            isWebcamActive = true;
            webcamBtn.textContent = "Stop Webcam";
            currentImage = null; // Clear static image
            loop();
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Could not access webcam. Please ensure you have granted permission.");
        }
    }
}

function stopWebcam() {
    isWebcamActive = false;
    cancelAnimationFrame(animationFrameId);
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
}

function loop() {
    if (!isWebcamActive) return;
    renderAscii(videoElement);
    animationFrameId = requestAnimationFrame(loop);
}

function renderAscii(source = currentImage) {
    if (!source) return;

    const width = parseInt(resolutionInput.value);
    const density = densityInput.value;
    const invert = invertInput.checked;

    if (!density) return;

    // Calculate height based on aspect ratio
    // Assuming 'Courier New' or similar monospace font has approx 0.5-0.6 aspect ratio (width/height)
    // And CSS line-height is set to ~0.6 to compress rows.
    // So we treat the grid as square cells.
    // If the font cells were perfectly square (by CSS squashing), we'd use natural aspect ratio.
    // source aspect ratio = sw / sh.
    // target aspect ratio = tw / th.
    // We want tw / th = sw / sh => th = tw * (sh / sw).

    // For video element, use videoWidth/videoHeight
    const srcWidth = source.videoWidth || source.width;
    const srcHeight = source.videoHeight || source.height;

    if (!srcWidth || !srcHeight) return; // Not ready

    const height = Math.floor(width * (srcHeight / srcWidth));

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(source, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    let asciiStr = "";
    const len = density.length;

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const offset = (i * width + j) * 4;
            const r = pixels[offset];
            const g = pixels[offset + 1];
            const b = pixels[offset + 2];

            // Simple average brightness
            const brightness = (r + g + b) / 3;

            // Map brightness to character index
            let charIndex = Math.floor((brightness / 255) * len);
            if (charIndex >= len) charIndex = len - 1;

            if (invert) {
                charIndex = len - 1 - charIndex;
            }

            asciiStr += density[charIndex];
        }
        asciiStr += "\n";
    }

    asciiOutput.textContent = asciiStr;
}

// Initial placeholder render (optional or just leave static text)
