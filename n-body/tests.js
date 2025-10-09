// Test suite for the N-Body simulation
document.addEventListener('DOMContentLoaded', () => {
    const resultsList = document.getElementById('results');
    let testCount = 0;
    let passCount = 0;

    function test(description, testFn) {
        testCount++;
        const listItem = document.createElement('li');
        listItem.classList.add('test');
        try {
            testFn();
            listItem.textContent = `PASS: ${description}`;
            listItem.classList.add('pass');
            passCount++;
        } catch (error) {
            listItem.textContent = `FAIL: ${description} - ${error.message}`;
            listItem.classList.add('fail');
            console.error(error);
        }
        resultsList.appendChild(listItem);
    }

    // --- Mocks and Stubs ---
    // Mock canvas for boundary checks in tests
    const mockCanvas = { width: 1000, height: 1000 };
    // Mock context for the draw function (it doesn't need to do anything)
    const mockCtx = {
        beginPath: () => {},
        arc: () => {},
        fill: () => {}
    };


    // --- Test Cases ---

    test('Body class should be initialized with correct properties', () => {
        const body = new Body(10, 20, 100, 1, -1);
        if (body.x !== 10) throw new Error('Initial x is incorrect');
        if (body.y !== 20) throw new Error('Initial y is incorrect');
        if (body.mass !== 100) throw new Error('Initial mass is incorrect');
        if (body.vx !== 1) throw new Error('Initial vx is incorrect');
        if (body.vy !== -1) throw new Error('Initial vy is incorrect');
        if (typeof body.color !== 'string') throw new Error('Color should be a string');
    });

    test('applyForce should correctly update velocity based on mass', () => {
        const body = new Body(0, 0, 10, 0, 0);
        body.applyForce(20, -30); // fx, fy
        if (body.vx !== 2) throw new Error('vx not updated correctly'); // 20 / 10
        if (body.vy !== -3) throw new Error('vy not updated correctly'); // -30 / 10
    });

    test('update should correctly update position based on velocity', () => {
        const body = new Body(10, 20, 10, 5, -5);
        body.update(mockCanvas); // Pass mock canvas
        if (body.x !== 15) throw new Error('x not updated correctly');
        if (body.y !== 15) throw new Error('y not updated correctly');
    });

    test('calculateForces should apply gravitational force correctly between two bodies', () => {
        const bodyA = new Body(0, 0, 10, 0, 0);
        const bodyB = new Body(10, 0, 10, 0, 0);

        const testBodies = [bodyA, bodyB];

        calculateForces(testBodies);

        // Force = G * m1 * m2 / d^2 = 0.1 * 10 * 10 / 100 = 0.1
        // fx = force * dx / d = 0.1 * 10 / 10 = 0.1
        // fy = force * dy / d = 0.1 * 0 / 10 = 0

        // ax = fx / m = 0.1 / 10 = 0.01
        if (Math.abs(bodyA.vx - 0.01) > 1e-9) throw new Error(`Body A vx is incorrect. Expected 0.01, got ${bodyA.vx}`);
        if (Math.abs(bodyB.vx - (-0.01)) > 1e-9) throw new Error(`Body B vx is incorrect. Expected -0.01, got ${bodyB.vx}`);
        if (Math.abs(bodyA.vy) > 1e-9) throw new Error('Body A vy should be 0');
        if (Math.abs(bodyB.vy) > 1e-9) throw new Error('Body B vy should be 0');
    });

    // --- Summary ---
    const summary = document.createElement('p');
    summary.textContent = `Tests complete: ${passCount} / ${testCount} passed.`;
    resultsList.appendChild(summary);
});