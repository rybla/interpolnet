const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clear-btn');
const toolbarItems = document.querySelectorAll('.component-icon');

let components = [];
let wires = [];

let isDragging = false;
let draggedComponent = null;
let dragStartX = 0;
let dragStartY = 0;
let hasMoved = false;

let isWiring = false;
let wiringStartPin = null;

let mouseX = 0;
let mouseY = 0;

// Resize canvas
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
// Call once after a small delay to ensure container is sized
setTimeout(resizeCanvas, 100);

// --- Classes ---

class Pin {
    constructor(component, type, index, total) {
        this.component = component;
        this.type = type; // 'input' or 'output'
        this.value = false;
        this.radius = 6;
        this.index = index;
        this.total = total;
    }

    get x() {
        // Dynamic position based on component current pos
        const offsetY = (this.component.height / (this.total + 1)) * (this.index + 1);
        const offsetX = this.type === 'input' ? 0 : this.component.width;
        return this.component.x + offsetX;
    }
    get y() {
        const offsetY = (this.component.height / (this.total + 1)) * (this.index + 1);
        return this.component.y + offsetY;
    }

    isMouseOver(mx, my) {
        const dx = this.x - mx;
        const dy = this.y - my;
        return dx*dx + dy*dy < 100; // 10px radius hit area
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.value ? '#0f0' : '#555';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

class Component {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 60;
        this.height = 40;
        this.inputs = [];
        this.outputs = [];
        this.label = type;
        this.color = '#333';
        this.state = false; // For switch/bulb

        this.initPins();
    }

    initPins() {
        if (this.type === 'AND' || this.type === 'OR' || this.type === 'XOR') {
            this.inputs.push(new Pin(this, 'input', 0, 2));
            this.inputs.push(new Pin(this, 'input', 1, 2));
            this.outputs.push(new Pin(this, 'output', 0, 1));
        } else if (this.type === 'NOT') {
            this.inputs.push(new Pin(this, 'input', 0, 1));
            this.outputs.push(new Pin(this, 'output', 0, 1));
        } else if (this.type === 'SWITCH') {
            this.width = 40;
            this.height = 40;
            this.outputs.push(new Pin(this, 'output', 0, 1));
            this.state = false;
        } else if (this.type === 'BULB') {
            this.width = 40;
            this.height = 40;
            this.inputs.push(new Pin(this, 'input', 0, 1));
        }
    }

    evaluate() {
        const ins = this.inputs.map(p => p.value);
        if (this.type === 'AND') {
            this.outputs[0].value = ins[0] && ins[1];
        } else if (this.type === 'OR') {
            this.outputs[0].value = ins[0] || ins[1];
        } else if (this.type === 'XOR') {
            this.outputs[0].value = (ins[0] ? 1 : 0) ^ (ins[1] ? 1 : 0);
        } else if (this.type === 'NOT') {
            this.outputs[0].value = !ins[0];
        } else if (this.type === 'SWITCH') {
            this.outputs[0].value = this.state;
            this.color = this.state ? '#006600' : '#333';
        } else if (this.type === 'BULB') {
            this.state = ins[0];
            this.color = this.state ? '#00ff00' : '#222';
        }
    }

    isMouseOver(mx, my) {
        return mx > this.x && mx < this.x + this.width &&
               my > this.y && my < this.y + this.height;
    }

    draw(ctx) {
        // Draw body
        ctx.fillStyle = this.color;
        if (this.type === 'BULB' && this.state) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#0f0';
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0; // Reset

        // Draw Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let labelText = this.label;
        if (this.type === 'SWITCH') labelText = this.state ? 'ON' : 'OFF';
        if (this.type === 'BULB') labelText = '';

        ctx.fillText(labelText, this.x + this.width/2, this.y + this.height/2);

        // Draw Pins
        this.inputs.forEach(p => p.draw(ctx));
        this.outputs.forEach(p => p.draw(ctx));
    }
}

class Wire {
    constructor(startPin, endPin) {
        this.startPin = startPin;
        this.endPin = endPin;
    }

    draw(ctx) {
        ctx.beginPath();
        // Bezier curve for wire
        const x1 = this.startPin.x;
        const y1 = this.startPin.y;
        const x2 = this.endPin.x;
        const y2 = this.endPin.y;

        ctx.moveTo(x1, y1);
        // Control points for smooth curve
        const dist = Math.abs(x2 - x1) * 0.5;
        const cp1x = x1 + Math.max(dist, 50);
        const cp1y = y1;
        const cp2x = x2 - Math.max(dist, 50);
        const cp2y = y2;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);

        ctx.strokeStyle = this.startPin.value ? '#0f0' : '#555';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

// --- Interaction ---

function getPinAt(x, y) {
    for (const comp of components) {
        for (const pin of [...comp.inputs, ...comp.outputs]) {
            if (pin.isMouseOver(x, y)) return pin;
        }
    }
    return null;
}

function getComponentAt(x, y) {
    // Reverse order to pick top-most
    for (let i = components.length - 1; i >= 0; i--) {
        if (components[i].isMouseOver(x, y)) return components[i];
    }
    return null;
}

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 0) { // Left click
        const pin = getPinAt(x, y);
        if (pin) {
            if (pin.type === 'output') {
                isWiring = true;
                wiringStartPin = pin;
            }
            return;
        }

        const comp = getComponentAt(x, y);
        if (comp) {
            isDragging = true;
            draggedComponent = comp;
            draggedComponent.dragOffsetX = x - comp.x;
            draggedComponent.dragOffsetY = y - comp.y;
            hasMoved = false;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (isDragging && draggedComponent) {
        draggedComponent.x = mouseX - draggedComponent.dragOffsetX;
        draggedComponent.y = mouseY - draggedComponent.dragOffsetY;
        hasMoved = true;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isWiring) {
        const pin = getPinAt(mouseX, mouseY);
        if (pin && pin.type === 'input' && wiringStartPin.component !== pin.component) {
            // Remove existing wire to this input
            wires = wires.filter(w => w.endPin !== pin);
            wires.push(new Wire(wiringStartPin, pin));
        }
        isWiring = false;
        wiringStartPin = null;
    }

    if (isDragging) {
        if (draggedComponent && draggedComponent.type === 'SWITCH' && !hasMoved) {
            draggedComponent.state = !draggedComponent.state;
        }
        isDragging = false;
        draggedComponent = null;
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Delete component
    const comp = getComponentAt(x, y);
    if (comp) {
        // Remove wires connected to it
        wires = wires.filter(w => w.startPin.component !== comp && w.endPin.component !== comp);
        components = components.filter(c => c !== comp);
        return;
    }

    // Delete wire? (checking collision with curve is hard, let's skip for now)
});

// Drag and Drop from Toolbar
toolbarItems.forEach(item => {
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.type);
    });
});

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (type) {
        components.push(new Component(x - 30, y - 20, type));
    }
});

clearBtn.addEventListener('click', () => {
    components = [];
    wires = [];
});

// --- Loop ---

function update() {
    // Reset inputs
    components.forEach(c => {
        c.inputs.forEach(p => p.value = false);
    });

    // Propagate
    wires.forEach(w => {
        w.endPin.value = w.startPin.value;
    });

    // Evaluate
    components.forEach(c => c.evaluate());
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw wires
    wires.forEach(w => w.draw(ctx));

    // Draw temp wire
    if (isWiring && wiringStartPin) {
        ctx.beginPath();
        ctx.moveTo(wiringStartPin.x, wiringStartPin.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw components
    components.forEach(c => c.draw(ctx));
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
