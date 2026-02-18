const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tSlider = document.getElementById('t-slider');
const tValueSpan = document.getElementById('t-value');
const btnAnimate = document.getElementById('btn-animate');
const btnLinear = document.getElementById('btn-linear');
const btnQuadratic = document.getElementById('btn-quadratic');
const btnCubic = document.getElementById('btn-cubic');
const chkConstruction = document.getElementById('chk-construction');
const chkCurve = document.getElementById('chk-curve');
const chkPoints = document.getElementById('chk-points');

let points = [];
let t = 0.5;
let isAnimating = false;
let animationFrameId;
let selectedPoint = null;
let degree = 2; // Default quadratic

class Point {
    constructor(x, y, label) {
        this.x = x;
        this.y = y;
        this.label = label;
        this.radius = 8;
        this.isHovered = false;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isHovered ? '#ffeb3b' : '#2196F3';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(this.label, this.x + 12, this.y - 12);
    }

    isMouseOver(mx, my) {
        const dx = this.x - mx;
        const dy = this.y - my;
        return dx * dx + dy * dy <= this.radius * this.radius * 2; // Slightly larger hit area
    }
}

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setDegree(2); // Start with Quadratic

    // Event Listeners
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, {passive: false});
    canvas.addEventListener('touchmove', onTouchMove, {passive: false});
    canvas.addEventListener('touchend', onMouseUp);

    tSlider.addEventListener('input', (e) => {
        t = parseFloat(e.target.value);
        tValueSpan.textContent = t.toFixed(2);
        if (isAnimating) stopAnimation();
        draw();
    });

    btnAnimate.addEventListener('click', toggleAnimation);

    btnLinear.addEventListener('click', () => setDegree(1));
    btnQuadratic.addEventListener('click', () => setDegree(2));
    btnCubic.addEventListener('click', () => setDegree(3));

    chkConstruction.addEventListener('change', draw);
    chkCurve.addEventListener('change', draw);
    chkPoints.addEventListener('change', draw);

    draw();
}

function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    draw();
}

function setDegree(d) {
    degree = d;
    points = [];

    const w = canvas.width;
    const h = canvas.height;
    const pad = Math.min(w, h) * 0.2;

    if (d === 1) { // Linear
        points.push(new Point(pad, h - pad, 'P0'));
        points.push(new Point(w - pad, pad, 'P1'));
    } else if (d === 2) { // Quadratic
        points.push(new Point(pad, h - pad, 'P0'));
        points.push(new Point(w / 2, pad, 'P1'));
        points.push(new Point(w - pad, h - pad, 'P2'));
    } else if (d === 3) { // Cubic
        points.push(new Point(pad, h - pad, 'P0'));
        points.push(new Point(pad, pad, 'P1'));
        points.push(new Point(w - pad, pad, 'P2'));
        points.push(new Point(w - pad, h - pad, 'P3'));
    }

    // Update UI buttons
    [btnLinear, btnQuadratic, btnCubic].forEach(btn => btn.classList.remove('active'));
    if (d === 1) btnLinear.classList.add('active');
    if (d === 2) btnQuadratic.classList.add('active');
    if (d === 3) btnCubic.classList.add('active');

    draw();
}

function lerp(p0, p1, t) {
    return {
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t
    };
}

// De Casteljau's algorithm
// Returns the point at t, and optionally draws the construction lines
function deCasteljau(pts, t, drawConstruction) {
    if (pts.length === 1) {
        return pts[0];
    }

    const newPts = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p = lerp(pts[i], pts[i+1], t);
        newPts.push(p);
    }

    if (drawConstruction && chkConstruction.checked) {
        ctx.beginPath();
        ctx.moveTo(newPts[0].x, newPts[0].y);
        for (let i = 1; i < newPts.length; i++) {
            ctx.lineTo(newPts[i].x, newPts[i].y);
        }

        // Color based on recursion depth (pts.length)
        // Degree 3: 4 pts -> 3 lines (green) -> 2 lines (yellow) -> 1 point (red)
        const depth = degree - pts.length + 2;
        const colors = ['#4CAF50', '#FFC107', '#E91E63'];
        ctx.strokeStyle = colors[depth % colors.length];
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed lines for construction
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw the intermediate points
        ctx.fillStyle = colors[depth % colors.length];
        for (const p of newPts) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    return deCasteljau(newPts, t, drawConstruction);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Control Polygon (Gray lines connecting control points)
    if (chkPoints.checked && points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 2. Draw The Curve
    if (chkCurve.checked && points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        // We can use the native bezierCurveTo for quadratic/cubic for better performance/smoothness,
        // but since we want to demonstrate the algorithm, let's compute it manually using segments?
        // Actually, for visualization, standard canvas bezier is fine for the "final curve",
        // but De Casteljau is exact. Let's use many small segments to be consistent with De Casteljau.
        // OR just use canvas functions which are optimized.
        // Let's use canvas native functions where possible for the "perfect" curve.

        if (degree === 2) {
             ctx.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
        } else if (degree === 3) {
             ctx.bezierCurveTo(points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y);
        } else {
             // Linear
             ctx.lineTo(points[1].x, points[1].y);
        }

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // 3. Draw Construction at current t
    if (points.length > 1) {
        const finalPoint = deCasteljau(points, t, true);

        // Draw the final point on the curve
        ctx.beginPath();
        ctx.arc(finalPoint.x, finalPoint.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#f44336'; // Red
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 4. Draw Control Points
    if (chkPoints.checked) {
        for (const p of points) {
            p.draw(ctx);
        }
    }
}

// Interaction
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function onMouseDown(e) {
    const pos = getMousePos(e);
    for (const p of points) {
        if (p.isMouseOver(pos.x, pos.y)) {
            selectedPoint = p;
            break;
        }
    }
}

function onMouseMove(e) {
    const pos = getMousePos(e);

    // Hover effect
    let hovering = false;
    for (const p of points) {
        if (p.isMouseOver(pos.x, pos.y)) {
            p.isHovered = true;
            hovering = true;
            canvas.style.cursor = 'pointer';
        } else {
            p.isHovered = false;
        }
    }
    if (!hovering) canvas.style.cursor = 'default';

    if (selectedPoint) {
        selectedPoint.x = pos.x;
        selectedPoint.y = pos.y;
        draw();
    } else {
        // Redraw for hover effect
        draw();
    }
}

function onMouseUp() {
    selectedPoint = null;
}

function onTouchStart(e) {
    e.preventDefault();
    onMouseDown(e);
}

function onTouchMove(e) {
    e.preventDefault();
    onMouseMove(e);
}

// Animation
function toggleAnimation() {
    if (isAnimating) {
        stopAnimation();
    } else {
        startAnimation();
    }
}

function startAnimation() {
    isAnimating = true;
    btnAnimate.textContent = 'Pause Animation';
    btnAnimate.classList.add('playing');
    animate();
}

function stopAnimation() {
    isAnimating = false;
    btnAnimate.textContent = 'Play Animation';
    btnAnimate.classList.remove('playing');
    cancelAnimationFrame(animationFrameId);
}

function animate() {
    if (!isAnimating) return;

    t += 0.005;
    if (t > 1) t = 0;

    tSlider.value = t;
    tValueSpan.textContent = t.toFixed(2);

    draw();
    animationFrameId = requestAnimationFrame(animate);
}

// Init
init();
