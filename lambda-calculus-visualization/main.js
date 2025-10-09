document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('main-canvas');
    const lambdaInput = document.getElementById('lambda-input');
    const examplesDropdown = document.getElementById('examples-dropdown');
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const stepButton = document.getElementById('step-button');
    const restartButton = document.getElementById('restart-button');
    const errorBox = document.getElementById('error-box');
    const { parse, betaReduce } = window.lambdaCore;

    // --- 3D Visualization (Three.js) ---
    let scene, camera, renderer, controls;
    let currentTerm = null;

    function init3D() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);

        camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.set(0, 5, 25); // Adjusted for a better view of the 3D tree

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0); // Look at the center of the scene

        const light = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(light);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        animate();
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    function clearScene() {
        while(scene.children.length > 0){ 
            scene.remove(scene.children[0]); 
        }
    }

    function create3DGraph(term) {
        const nodeMap = new Map();
        let nodeCount = 0;
        
        // 1. First pass: discover all nodes and their children
        function discoverNodes(node) {
            if (!node || nodeMap.has(node)) return;
            
            const children = [];
            if (node.type === 'abstraction') {
                children.push(node.term);
            } else if (node.type === 'application') {
                children.push(node.func);
                children.push(node.arg);
            }
            nodeMap.set(node, { children: children, position: null });
            nodeCount++;
            
            children.forEach(discoverNodes);
        }
        
        discoverNodes(term);

        // 2. Generate positions using Fibonacci sphere algorithm
        const points = [];
        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians

        for (let i = 0; i < nodeCount; i++) {
            const y = 1 - (i / (nodeCount - 1)) * 2; // y goes from 1 to -1
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            points.push(new THREE.Vector3(x, y, z).multiplyScalar(10)); // Scale sphere radius
        }

        // 3. Assign positions and create edges
        let i = 0;
        const nodeQueue = [term];
        const visited = new Set([term]);
        
        while(nodeQueue.length > 0) {
            const currentNode = nodeQueue.shift();
            const nodeData = nodeMap.get(currentNode);
            if (nodeData.position === null) {
                nodeData.position = points[i++];
            }
            
            nodeData.children.forEach(child => {
                if (!visited.has(child)) {
                    visited.add(child);
                    nodeQueue.push(child);
                }
            });
        }

        // 4. Render nodes and edges
        const materials = {
            abstraction: new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.3, roughness: 0.4 }),
            application: new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.3, roughness: 0.4 }),
            variable: new THREE.MeshStandardMaterial({ color: 0x0000ff, metalness: 0.3, roughness: 0.4 }),
        };

        for (const [node, data] of nodeMap.entries()) {
            let mesh;
            if (node.type === 'abstraction') {
                const geometry = new THREE.SphereGeometry(0.5, 32, 32);
                mesh = new THREE.Mesh(geometry, materials.abstraction);
            } else if (node.type === 'application') {
                const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                mesh = new THREE.Mesh(geometry, materials.application);
            } else if (node.type === 'variable') {
                const geometry = new THREE.ConeGeometry(0.4, 0.7, 32);
                mesh = new THREE.Mesh(geometry, materials.variable);
                const label = createTextSprite(node.index.toString());
                label.position.set(0, 0.7, 0);
                mesh.add(label);
            }
            mesh.position.copy(data.position);
            scene.add(mesh);

            // Draw edges to children
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
            data.children.forEach(child => {
                const childData = nodeMap.get(child);
                const points = [data.position, childData.position];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                scene.add(line);
            });
        }
    }

    function createTextSprite(message) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = 'Bold 48px Arial';
        const metrics = context.measureText(message);
        const textWidth = metrics.width;
    
        canvas.width = textWidth;
        canvas.height = 48;
        context.font = 'Bold 48px Arial';
        context.fillStyle = 'rgba(0, 0, 0, 1.0)';
        context.fillText(message, 0, 48);
    
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
    
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.02 * textWidth, 0.02 * 48, 1.0);
        return sprite;
    }

    function updateVisualization() {
        clearScene();
        if (currentTerm) {
            create3DGraph(currentTerm);
        }
    }

    // --- Event Listeners ---
    lambdaInput.addEventListener('input', () => {
        try {
            const ast = parse(lambdaInput.value);
            currentTerm = ast;
            updateVisualization();
        } catch (error) {
            console.error(error.message);
            // Display error to the user
        }
    });

    // --- UI & Interaction ---
    let simulationInterval = null;
    let initialTerm = null;

    const examples = {
        'Identity': 'L(V(0))',
        'Self-Apply': 'A(L(A(V(0), V(0))), L(A(V(0), V(0))))', // Omega combinator
        'Y-Combinator': 'L(A(L(A(V(1),A(V(0),V(0)))),L(A(V(1),A(V(0),V(0))))))',
        'True': 'L(L(V(1)))',
        'False': 'L(L(V(0)))',
    };

    function populateExamples() {
        for (const name in examples) {
            const option = document.createElement('option');
            option.value = examples[name];
            option.textContent = name;
            examplesDropdown.appendChild(option);
        }
    }

    examplesDropdown.addEventListener('change', (e) => {
        if (e.target.value) {
            lambdaInput.value = e.target.value;
            lambdaInput.dispatchEvent(new Event('input'));
        }
    });

    function showError(message) {
        errorBox.textContent = message;
        errorBox.classList.add('visible');
    }

    function hideError() {
        errorBox.classList.remove('visible');
    }

    function handleInputChange() {
        try {
            hideError();
            const ast = parse(lambdaInput.value);
            initialTerm = ast;
            currentTerm = JSON.parse(JSON.stringify(initialTerm)); // Deep copy
            updateVisualization();
            if (simulationInterval) clearInterval(simulationInterval);
        } catch (error) {
            console.error(error.message);
            showError(`Parsing Error: ${error.message}`);
            initialTerm = null;
            currentTerm = null;
            clearScene();
        }
    }

    lambdaInput.addEventListener('input', handleInputChange);

    startButton.addEventListener('click', () => {
        if (!simulationInterval && currentTerm) {
            hideError();
            simulationInterval = setInterval(() => {
                stepButton.click();
            }, 500);
        }
    });

    pauseButton.addEventListener('click', () => {
        clearInterval(simulationInterval);
        simulationInterval = null;
    });

    stepButton.addEventListener('click', () => {
        if (currentTerm) {
            const result = betaReduce(currentTerm);
            if (result.reduced) {
                currentTerm = result.term;
                updateVisualization();
            } else {
                clearInterval(simulationInterval);
                simulationInterval = null;
                showError("No more reductions possible.");
            }
        }
    });

    restartButton.addEventListener('click', () => {
        if (initialTerm) {
            currentTerm = JSON.parse(JSON.stringify(initialTerm)); // Deep copy
            updateVisualization();
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }, false);


    // --- Initialization ---
    init3D();
    populateExamples();
    // Trigger initial parse if there's content
    if(lambdaInput.value) {
        handleInputChange();
    }
});