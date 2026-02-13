document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const segmentsInput = document.getElementById('segments');
    const segmentsVal = document.getElementById('segments-val');
    const colorInput = document.getElementById('color');
    const sizeInput = document.getElementById('size');
    const sizeVal = document.getElementById('size-val');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const rainbowInput = document.getElementById('rainbow');

    let segments = parseInt(segmentsInput.value);
    let color = colorInput.value;
    let size = parseInt(sizeInput.value);
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hue = 0;

    // Set canvas size
    function resizeCanvas() {
        const wrapper = document.querySelector('.canvas-wrapper');
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
        // Fill with black on resize to prevent transparency issues
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Drawing functions
    function startDrawing(e) {
        isDrawing = true;
        const { x, y } = getCoordinates(e);
        lastX = x;
        lastY = y;
    }

    function stopDrawing() {
        isDrawing = false;
        ctx.beginPath(); // Reset path
    }

    function draw(e) {
        if (!isDrawing) return;

        const { x, y } = getCoordinates(e);

        // Update color if rainbow mode is on
        if (rainbowInput.checked) {
            hue = (hue + 1) % 360;
            color = `hsl(${hue}, 100%, 50%)`;
        } else {
            color = colorInput.value;
        }

        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const angleStep = (Math.PI * 2) / segments;

        ctx.save();
        ctx.translate(centerX, centerY);

        for (let i = 0; i < segments; i++) {
            ctx.save();
            ctx.rotate(i * angleStep);

            // Draw the segment
            ctx.beginPath();
            ctx.moveTo(lastX - centerX, lastY - centerY);
            ctx.lineTo(x - centerX, y - centerY);
            ctx.stroke();

            // Optional: Mirror reflection within the segment for a true kaleidoscope effect
            // If we want mirror symmetry, we would draw again with an inverted Y (or X) after rotating
            // For now, let's stick to rotational symmetry as it's more predictable for drawing.

            ctx.restore();
        }
        ctx.restore();

        lastX = x;
        lastY = y;
    }

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    // Event Listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scrolling
        startDrawing(e);
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });
    canvas.addEventListener('touchend', stopDrawing);

    // Controls
    segmentsInput.addEventListener('input', (e) => {
        segments = parseInt(e.target.value);
        segmentsVal.textContent = segments;
    });

    colorInput.addEventListener('input', (e) => {
        color = e.target.value;
        // If user picks a color, disable rainbow mode? No, just let it be.
        if (rainbowInput.checked) {
             // Maybe uncheck rainbow mode if user manually picks a color
             // rainbowInput.checked = false;
        }
    });

    sizeInput.addEventListener('input', (e) => {
        size = parseInt(e.target.value);
        sizeVal.textContent = size;
    });

    clearBtn.addEventListener('click', () => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    saveBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'kaleidoscope.png';
        link.href = canvas.toDataURL();
        link.click();
    });
});
