/*
    WebGL Fluid Simulation
    Based on "Real-Time Fluid Dynamics for Games" by Jos Stam
    and "GPU Gems: Fast Fluid Dynamics Simulation on the GPU"
*/

const canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const config = {
    TEXTURE_DOWNSAMPLE: 1, // 0: full res, 1: half res, 2: quarter res
    DENSITY_DISSIPATION: 0.98,
    VELOCITY_DISSIPATION: 0.99,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.0025
};

let gl = canvas.getContext('webgl2', { alpha: false });
if (!gl) {
    console.error("WebGL 2 not supported");
}

const ext = {
    colorBufferFloat: gl.getExtension('EXT_color_buffer_float'),
    linearFloat: gl.getExtension('OES_texture_float_linear')
};

// Shaders

const baseVertexShader = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;

void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

const copyShader = compileShader(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
uniform sampler2D uTexture;

out vec4 outColor;

void main () {
    outColor = texture(uTexture, vUv);
}
`);

const splatShader = compileShader(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;

out vec4 outColor;

void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture(uTarget, vUv).xyz;
    outColor = vec4(base + splat, 1.0);
}
`);

const advectionShader = compileShader(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;

out vec4 outColor;

void main () {
    vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
    outColor = dissipation * texture(uSource, coord);
}
`);

const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
uniform sampler2D uVelocity;

out vec4 outColor;

void main () {
    float L = texture(uVelocity, vL).x;
    float R = texture(uVelocity, vR).x;
    float T = texture(uVelocity, vT).y;
    float B = texture(uVelocity, vB).y;

    vec2 C = texture(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }

    float div = 0.5 * (R - L + T - B);
    outColor = vec4(div, 0.0, 0.0, 1.0);
}
`);

const curlShader = compileShader(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
uniform sampler2D uVelocity;

out vec4 outColor;

void main () {
    float L = texture(uVelocity, vL).y;
    float R = texture(uVelocity, vR).y;
    float T = texture(uVelocity, vT).x;
    float B = texture(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    outColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`);

const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;

out vec4 outColor;

void main () {
    float L = texture(uCurl, vL).x;
    float R = texture(uCurl, vR).x;
    float T = texture(uCurl, vT).x;
    float B = texture(uCurl, vB).x;
    float C = texture(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    float len = length(force);
    if (len > 0.0001) {
        force /= len;
    }
    force *= curl * C;
    force.y *= -1.0;

    vec2 vel = texture(uVelocity, vUv).xy;
    outColor = vec4(vel + force * dt, 0.0, 1.0);
}
`);

const pressureShader = compileShader(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;

out vec4 outColor;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    float C = texture(uPressure, vUv).x;
    float divergence = texture(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    outColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`);

const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

out vec4 outColor;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    vec2 velocity = texture(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    outColor = vec4(velocity, 0.0, 1.0);
}
`);

const displayShader = compileShader(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
uniform sampler2D uTexture;

out vec4 outColor;

void main () {
    vec3 c = texture(uTexture, vUv).rgb;
    // float a = max(c.r, max(c.g, c.b));
    outColor = vec4(c, 1.0);
}
`);

// Initialization
let simWidth, simHeight;
let dye, velocity, divergence, curl, pressure;
let programs = {};

class Program {
    constructor(vertexShaderSource, fragmentShader) {
        this.program = gl.createProgram();
        const vs = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.program));
        }
        this.uniforms = {};
        const count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const name = gl.getActiveUniform(this.program, i).name;
            this.uniforms[name] = gl.getUniformLocation(this.program, name);
        }
    }
    bind() {
        gl.useProgram(this.program);
    }
}

function init() {
    simWidth = Math.floor(canvas.width >> config.TEXTURE_DOWNSAMPLE);
    simHeight = Math.floor(canvas.height >> config.TEXTURE_DOWNSAMPLE);

    const texType = gl.FLOAT; // We need float textures. Using EXT_color_buffer_float

    dye = createDoubleFBO(simWidth, simHeight, texType);
    velocity = createDoubleFBO(simWidth, simHeight, texType);
    divergence = createFBO(simWidth, simHeight, texType);
    curl = createFBO(simWidth, simHeight, texType);
    pressure = createDoubleFBO(simWidth, simHeight, texType);

    programs.copy = new Program(baseVertexShader, copyShader);
    programs.splat = new Program(baseVertexShader, splatShader);
    programs.advection = new Program(baseVertexShader, advectionShader);
    programs.divergence = new Program(baseVertexShader, divergenceShader);
    programs.curl = new Program(baseVertexShader, curlShader);
    programs.vorticity = new Program(baseVertexShader, vorticityShader);
    programs.pressure = new Program(baseVertexShader, pressureShader);
    programs.gradSubtract = new Program(baseVertexShader, gradientSubtractShader);
    programs.display = new Program(baseVertexShader, displayShader);
}


function createFBO(w, h, type) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return {
        texture,
        fbo,
        width: w,
        height: h,
        attach: (id) => {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };
}

function createDoubleFBO(w, h, type) {
    let fbo1 = createFBO(w, h, type);
    let fbo2 = createFBO(w, h, type);

    return {
        get read() { return fbo1; },
        get write() { return fbo2; },
        swap: () => {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        }
    };
}

function blit(destination) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination ? destination.fbo : null);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// Geometry for full screen quad
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    -1, 1,
    1, -1,
    1, 1
]), gl.STATIC_DRAW);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);


// Render Loop

let lastTime = Date.now();
function update() {
    const dt = Math.min((Date.now() - lastTime) / 1000, 0.016);
    lastTime = Date.now();

    // Resize if needed
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        // Re-init? Nah
    }

    gl.viewport(0, 0, simWidth, simHeight);

    // 1. Advection
    programs.advection.bind();
    gl.uniform2f(programs.advection.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1f(programs.advection.uniforms.dt, dt);
    gl.uniform1f(programs.advection.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(programs.advection.uniforms.uSource, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    programs.advection.bind();
    gl.uniform1f(programs.advection.uniforms.dissipation, config.DENSITY_DISSIPATION);
    gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(programs.advection.uniforms.uSource, dye.read.attach(1));
    blit(dye.write);
    dye.swap();

    // 2. Vorticity Confinement
    programs.curl.bind();
    gl.uniform2f(programs.curl.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(programs.curl.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    programs.vorticity.bind();
    gl.uniform2f(programs.vorticity.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(programs.vorticity.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(programs.vorticity.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(programs.vorticity.uniforms.curl, config.CURL);
    gl.uniform1f(programs.vorticity.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();


    // 3. Divergence
    programs.divergence.bind();
    gl.uniform2f(programs.divergence.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(programs.divergence.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    // 4. Clear Pressure
    // Simply use existing pressure as initial guess

    // 5. Pressure Solving (Jacobi)
    programs.pressure.bind();
    gl.uniform2f(programs.pressure.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(programs.pressure.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(programs.pressure.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
    }

    // 6. Gradient Subtract
    programs.gradSubtract.bind();
    gl.uniform2f(programs.gradSubtract.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(programs.gradSubtract.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(programs.gradSubtract.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    // 7. Display
    gl.viewport(0, 0, canvas.width, canvas.height);
    programs.display.bind();
    gl.uniform1i(programs.display.uniforms.uTexture, dye.read.attach(0));
    blit(null);

    requestAnimationFrame(update);
}

// Input handling

let splats = [];

function splat(x, y, dx, dy, color) {
    gl.viewport(0, 0, simWidth, simHeight);
    programs.splat.bind();
    gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(programs.splat.uniforms.aspectRatio, simWidth / simHeight);
    gl.uniform2f(programs.splat.uniforms.point, x / canvas.width, 1.0 - y / canvas.height);
    gl.uniform3f(programs.splat.uniforms.color, dx, -dy, 1.0);
    gl.uniform1f(programs.splat.uniforms.radius, config.SPLAT_RADIUS);
    blit(velocity.write);
    velocity.swap();

    programs.splat.bind();
    gl.uniform1i(programs.splat.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(programs.splat.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
}

let isMouseDown = false;
let lastMouse = {x: 0, y: 0};

canvas.addEventListener('mousedown', e => {
    isMouseDown = true;
    lastMouse.x = e.offsetX;
    lastMouse.y = e.offsetY;
});

canvas.addEventListener('mousemove', e => {
    if (!isMouseDown) return;
    const x = e.offsetX;
    const y = e.offsetY;
    const dx = x - lastMouse.x;
    const dy = y - lastMouse.y;
    lastMouse.x = x;
    lastMouse.y = y;

    const t = Date.now() * 0.002;
    const color = {
        r: Math.sin(t) * 0.5 + 0.5,
        g: Math.sin(t + 2) * 0.5 + 0.5,
        b: Math.sin(t + 4) * 0.5 + 0.5
    };
    splat(x, y, dx * 5.0, dy * 5.0, color);
});

canvas.addEventListener('mouseup', () => isMouseDown = false);

// Touch support
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    isMouseDown = true;
    lastMouse.x = e.touches[0].clientX;
    lastMouse.y = e.touches[0].clientY;
});
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!isMouseDown) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - lastMouse.x;
    const dy = y - lastMouse.y;
    lastMouse.x = x;
    lastMouse.y = y;

    const t = Date.now() * 0.002;
    const color = {
        r: Math.sin(t) * 0.5 + 0.5,
        g: Math.sin(t + 2) * 0.5 + 0.5,
        b: Math.sin(t + 4) * 0.5 + 0.5
    };
    splat(x, y, dx * 5.0, dy * 5.0, color);
});
canvas.addEventListener('touchend', () => isMouseDown = false);


// Start
init();
update();

// Random splats to start
for (let i = 0; i < 20; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const dx = (Math.random() - 0.5) * 200;
    const dy = (Math.random() - 0.5) * 200;
    const color = {
        r: Math.random(),
        g: Math.random(),
        b: Math.random()
    };
    splat(x, y, dx, dy, color);
}

// UI Bindings
document.getElementById('curl').addEventListener('input', e => config.CURL = parseFloat(e.target.value));
document.getElementById('density-dissipation').addEventListener('input', e => config.DENSITY_DISSIPATION = parseFloat(e.target.value));
document.getElementById('velocity-dissipation').addEventListener('input', e => config.VELOCITY_DISSIPATION = parseFloat(e.target.value));
document.getElementById('reset').addEventListener('click', () => {
    init();
});
