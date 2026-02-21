// Constants
const GRID_SIZE = 20;
const GATE_WIDTH = 80;
const GATE_HEIGHT = 60;
const PIN_RADIUS = 8;
const WIRE_COLOR_OFF = '#555';
const WIRE_COLOR_ON = '#00bcd4'; // Cyan for ON
const GATE_BG = '#222';
const GATE_BORDER = '#555';
const GATE_BORDER_SELECTED = '#fff';
const TEXT_COLOR = '#fff';

// State
let components = [];
let wires = [];
let draggingComponent = null;
let dragOffset = { x: 0, y: 0 };
let wiringStartPin = null;
let mousePos = { x: 0, y: 0 };
let idCounter = 0;

// Canvas setup
const canvas = document.getElementById('circuit-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Classes

class Pin {
    constructor(component, type, index, total) {
        this.id = idCounter++;
        this.component = component;
        this.type = type; // 'input' or 'output'
        this.index = index;
        this.value = false;

        // Calculate relative position based on component size
        // Inputs on left, Outputs on right
        const spacing = GATE_HEIGHT / (total + 1);
        this.relY = spacing * (index + 1);
        this.relX = type === 'input' ? 0 : GATE_WIDTH;
    }

    get pos() {
        return {
            x: this.component.x + this.relX,
            y: this.component.y + this.relY
        };
    }
}

class Component {
    constructor(x, y, type) {
        this.id = idCounter++;
        this.x = x;
        this.y = y;
        this.type = type;
        this.inputs = [];
        this.outputs = [];
        this.width = GATE_WIDTH;
        this.height = GATE_HEIGHT;
        this.label = type;
        this.setupPins();
    }

    setupPins() {
        // Defined by subclasses
    }

    // Calculate output based on inputs
    compute() {
        // Defined by subclasses
    }

    draw(ctx) {
        // Body
        ctx.fillStyle = GATE_BG;
        ctx.strokeStyle = (draggingComponent === this) ? GATE_BORDER_SELECTED : GATE_BORDER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 6);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);

        // Pins
        this.drawPins(ctx, this.inputs);
        this.drawPins(ctx, this.outputs);
    }

    drawPins(ctx, pins) {
        pins.forEach(pin => {
            const pos = pin.pos;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, PIN_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = pin.value ? WIRE_COLOR_ON : '#444';
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();

            // Hover effect for pins
            const dx = mousePos.x - pos.x;
            const dy = mousePos.y - pos.y;
            if (dx * dx + dy * dy <= PIN_RADIUS * PIN_RADIUS * 1.5) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }

    isHit(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    getPinAt(x, y) {
        const pins = [...this.inputs, ...this.outputs];
        for (const pin of pins) {
            const pos = pin.pos;
            const dx = x - pos.x;
            const dy = y - pos.y;
            if (dx * dx + dy * dy <= PIN_RADIUS * PIN_RADIUS * 2.5) { // Larger hit area for easy clicking
                return pin;
            }
        }
        return null;
    }
}

class Gate extends Component {
    constructor(x, y, type) {
        super(x, y, type);
    }

    setupPins() {
        const inputCount = (this.type === 'NOT') ? 1 : 2;
        for (let i = 0; i < inputCount; i++) {
            this.inputs.push(new Pin(this, 'input', i, inputCount));
        }
        this.outputs.push(new Pin(this, 'output', 0, 1));
    }

    compute() {
        const in0 = this.inputs[0]?.value || false;
        const in1 = this.inputs[1]?.value || false;
        let out = false;

        switch (this.type) {
            case 'AND': out = in0 && in1; break;
            case 'OR': out = in0 || in1; break;
            case 'NOT': out = !in0; break;
            case 'XOR': out = (in0 ? 1 : 0) ^ (in1 ? 1 : 0); break;
            case 'NAND': out = !(in0 && in1); break;
        }

        this.outputs[0].value = out;
    }
}

class Switch extends Component {
    constructor(x, y) {
        super(x, y, 'SWITCH');
        this.state = false;
        this.label = 'OFF';
        this.width = 60;
    }

    setupPins() {
        this.outputs.push(new Pin(this, 'output', 0, 1));
    }

    toggle() {
        this.state = !this.state;
        this.label = this.state ? 'ON' : 'OFF';
    }

    compute() {
        this.outputs[0].value = this.state;
    }

    draw(ctx) {
        ctx.fillStyle = this.state ? '#388e3c' : '#c62828';
        ctx.strokeStyle = (draggingComponent === this) ? '#fff' : '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);

        this.drawPins(ctx, this.outputs);
    }
}

class Lamp extends Component {
    constructor(x, y) {
        super(x, y, 'LAMP');
        this.width = 60;
        this.state = false;
        this.label = '';
    }

    setupPins() {
        this.inputs.push(new Pin(this, 'input', 0, 1));
    }

    compute() {
        this.state = this.inputs[0].value;
    }

    draw(ctx) {
        // Draw container
        ctx.fillStyle = '#222';
        ctx.strokeStyle = (draggingComponent === this) ? '#fff' : '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 6);
        ctx.fill();
        ctx.stroke();

        // Draw Bulb
        ctx.beginPath();
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = 15;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

        if (this.state) {
            ctx.fillStyle = '#ffeb3b';
            ctx.shadowColor = '#ffeb3b';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#444';
            ctx.fill();
        }
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        this.drawPins(ctx, this.inputs);
    }
}

class Wire {
    constructor(startPin, endPin) {
        this.startPin = startPin;
        this.endPin = endPin;
    }

    draw(ctx) {
        const start = this.startPin.pos;
        const end = this.endPin.pos;

        ctx.strokeStyle = this.startPin.value ? WIRE_COLOR_ON : WIRE_COLOR_OFF;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);

        // Bezier curve
        const dist = Math.abs(end.x - start.x);
        const cp1x = start.x + dist * 0.5;
        const cp1y = start.y;
        const cp2x = end.x - dist * 0.5;
        const cp2y = end.y;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
        ctx.stroke();
    }
}


// Interaction Logic

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

canvas.addEventListener('mousedown', (e) => {
    // Prevent default to avoid text selection etc
    e.preventDefault();
    const { x, y } = getMousePos(e);

    // 1. Check Pins (Wiring)
    for (const comp of components) {
        const pin = comp.getPinAt(x, y);
        if (pin) {
            if (pin.type === 'output') {
                wiringStartPin = pin;
            } else {
                // If clicking input pin, maybe disconnect existing wire?
                // For simplicity: just allow new wires from outputs.
            }
            return;
        }
    }

    // 2. Check Components
    for (let i = components.length - 1; i >= 0; i--) {
        const comp = components[i];
        if (comp.isHit(x, y)) {
            // Bring to front
            components.splice(i, 1);
            components.push(comp);

            draggingComponent = comp;
            dragOffset = { x: x - comp.x, y: y - comp.y };
            isDragging = false; // Will set to true if moved
            dragStartX = x;
            dragStartY = y;
            return;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getMousePos(e);
    mousePos = { x, y };

    if (draggingComponent) {
        const dx = x - dragStartX;
        const dy = y - dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            isDragging = true;
        }

        draggingComponent.x = x - dragOffset.x;
        draggingComponent.y = y - dragOffset.y;
    }
});

canvas.addEventListener('mouseup', (e) => {
    const { x, y } = getMousePos(e);

    // Finish Wiring
    if (wiringStartPin) {
        for (const comp of components) {
            const pin = comp.getPinAt(x, y);
            if (pin && pin.type === 'input') {
                // Prevent connecting to self or same component (optional but good)
                if (pin.component !== wiringStartPin.component) {
                    // Remove existing wire connected to this input
                    wires = wires.filter(w => w.endPin !== pin);
                    wires.push(new Wire(wiringStartPin, pin));
                }
            }
        }
        wiringStartPin = null;
    }

    // Finish Dragging / Click
    if (draggingComponent) {
        if (!isDragging && draggingComponent.type === 'SWITCH') {
            draggingComponent.toggle();
        }
        draggingComponent = null;
    }

    isDragging = false;
});

// Context Menu (Right Click) to delete
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const { x, y } = getMousePos(e);

    // Check components
    for (let i = components.length - 1; i >= 0; i--) {
        const comp = components[i];
        if (comp.isHit(x, y)) {
            // Delete component and associated wires
            const compPins = [...comp.inputs, ...comp.outputs];
            wires = wires.filter(w => !compPins.includes(w.startPin) && !compPins.includes(w.endPin));
            components.splice(i, 1);
            return;
        }
    }

    // Check wires? (Harder to hit detection for bezier curves)
    // Maybe later.
});

// Drag and Drop from Toolbar
const tools = document.querySelectorAll('.tool');
tools.forEach(tool => {
    tool.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('type', tool.dataset.type);
    });
});

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const { x, y } = getMousePos(e);

    if (type) {
        let comp;
        const cx = x - GATE_WIDTH / 2;
        const cy = y - GATE_HEIGHT / 2;

        if (type === 'SWITCH') comp = new Switch(cx, cy);
        else if (type === 'LAMP') comp = new Lamp(cx, cy);
        else comp = new Gate(cx, cy, type);

        components.push(comp);
    }
});

document.getElementById('clear-btn').addEventListener('click', () => {
    components = [];
    wires = [];
});

// Simulation Loop
function simulate() {
    // 1. Reset all inputs to false first?
    // No, inputs hold value from wires.
    // Actually, we should clear inputs that aren't connected?
    // Or simpler: Iterate wires to set inputs.

    // Reset all inputs to default (false)
    components.forEach(comp => {
        comp.inputs.forEach(pin => pin.value = false);
    });

    // Propagate from outputs to inputs via wires
    wires.forEach(wire => {
        wire.endPin.value = wire.startPin.value;
    });

    // Compute new outputs for all components
    components.forEach(comp => {
        comp.compute();
    });
}

// Animation Loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Logic Step
    simulate();

    // Draw Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw Wires
    wires.forEach(wire => wire.draw(ctx));

    // Draw Wire Being Dragged
    if (wiringStartPin) {
        const start = wiringStartPin.pos;
        ctx.strokeStyle = wiringStartPin.value ? WIRE_COLOR_ON : WIRE_COLOR_OFF;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);

        const end = mousePos;
        const dist = Math.abs(end.x - start.x);
        const cp1x = start.x + dist * 0.5;
        const cp1y = start.y;
        const cp2x = end.x - dist * 0.5;
        const cp2y = end.y;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
        ctx.stroke();
    }

    // Draw Components
    components.forEach(comp => comp.draw(ctx));

    requestAnimationFrame(animate);
}

animate();
