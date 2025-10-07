// Basic Scene Setup
let scene, camera, renderer, container, controls;
let spheres = [];
const BOUNDS = 10; // The size of the containing box

// Control elements
const algorithmSelect = document.getElementById('algorithm');
const numSpheresSlider = document.getElementById('numSpheres');
const numSpheresValue = document.getElementById('numSpheresValue');
const sphereSizeSlider = document.getElementById('sphereSize');
const sphereSizeValue = document.getElementById('sphereSizeValue');
const animationSpeedSlider = document.getElementById('animationSpeed');
const animationSpeedValue = document.getElementById('animationSpeedValue');
const resetButton = document.getElementById('reset-btn');

// Configuration
let config = {
    algorithm: 'random',
    numSpheres: 100,
    sphereSize: 0.5,
    animationSpeed: 1,
};

function init() {
    container = document.getElementById('container');

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x111111, 0.05);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x111111);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 50;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(15, 15, 15);
    pointLight.castShadow = true;
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x00aaff, 2);
    pointLight2.position.set(-15, -10, -10);
    pointLight2.castShadow = true;
    scene.add(pointLight2);

    // Bounding Box (visual aid)
    const geometry = new THREE.BoxGeometry(BOUNDS * 2, BOUNDS * 2, BOUNDS * 2);
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333 }));
    scene.add(line);


    // Initial setup
    setupEventListeners();
    updateConfigFromControls();
    createSpheres();
    animate();
}

function clearSpheres() {
    spheres.forEach(sphere => scene.remove(sphere));
    spheres = [];
}

function createSpheres() {
    clearSpheres();

    const geometry = new THREE.SphereGeometry(config.sphereSize, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        metalness: 0.8,
        roughness: 0.2,
        envMapIntensity: 0.5
    });

    const positions = generatePositions();

    for (const pos of positions) {
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(pos);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        scene.add(sphere);
        spheres.push(sphere);
    }
}

function generatePositions() {
    const positions = [];
    const r = config.sphereSize;
    const n = Math.min(config.numSpheres, 500); // Cap for performance

    switch(config.algorithm) {
        case 'random':
            for (let i = 0; i < n; i++) {
                positions.push(new THREE.Vector3(
                    (Math.random() - 0.5) * (BOUNDS * 2 - r*2),
                    (Math.random() - 0.5) * (BOUNDS * 2 - r*2),
                    (Math.random() - 0.5) * (BOUNDS * 2 - r*2)
                ));
            }
            break;

        case 'fcc': // Face-Centered Cubic
            const a_fcc = 4 * r / Math.sqrt(2); // Lattice constant
            const max_coord_fcc = Math.ceil(BOUNDS / a_fcc);
            for (let i = -max_coord_fcc; i <= max_coord_fcc && positions.length < n; i++) {
                for (let j = -max_coord_fcc; j <= max_coord_fcc && positions.length < n; j++) {
                    for (let k = -max_coord_fcc; k <= max_coord_fcc && positions.length < n; k++) {
                        const p1 = new THREE.Vector3(i, j, k).multiplyScalar(a_fcc);
                        const p2 = new THREE.Vector3(i + 0.5, j + 0.5, k).multiplyScalar(a_fcc);
                        const p3 = new THREE.Vector3(i + 0.5, j, k + 0.5).multiplyScalar(a_fcc);
                        const p4 = new THREE.Vector3(i, j + 0.5, k + 0.5).multiplyScalar(a_fcc);
                        [p1, p2, p3, p4].forEach(p => {
                            if (p.length() < BOUNDS - r && positions.length < n) positions.push(p);
                        });
                    }
                }
            }
            break;

        case 'hcp': // Hexagonal Close-Packed
            const a_hcp = 2 * r;
            const c_hcp = a_hcp * Math.sqrt(8 / 3);
            const max_i_hcp = Math.ceil(BOUNDS / a_hcp);
            const max_j_hcp = Math.ceil(BOUNDS / (a_hcp * Math.sqrt(3) / 2));
            const max_k_hcp = Math.ceil(BOUNDS / c_hcp);
            for (let k = -max_k_hcp; k <= max_k_hcp && positions.length < n; k++) {
                for (let i = -max_i_hcp; i <= max_i_hcp && positions.length < n; i++) {
                    for (let j = -max_j_hcp; j <= max_j_hcp && positions.length < n; j++) {
                        const x = a_hcp * (i + (j % 2) * 0.5);
                        const y = a_hcp * Math.sqrt(3) / 2 * j;
                        const z = c_hcp * (k + ((i % 2 + j % 2) % 2) * 0.5);
                        const p = new THREE.Vector3(x, y, z);
                        if (p.length() < BOUNDS - r && positions.length < n) positions.push(p);
                    }
                }
            }
            break;
    }
    return positions;
}


function setupEventListeners() {
    algorithmSelect.addEventListener('change', () => {
        updateConfigFromControls();
        createSpheres();
    });
    numSpheresSlider.addEventListener('input', () => {
        numSpheresValue.textContent = numSpheresSlider.value;
    });
    numSpheresSlider.addEventListener('change', () => {
        updateConfigFromControls();
        createSpheres();
    });
    sphereSizeSlider.addEventListener('input', () => {
        sphereSizeValue.textContent = sphereSizeSlider.value;
    });
    sphereSizeSlider.addEventListener('change', () => {
        updateConfigFromControls();
        createSpheres();
    });
    animationSpeedSlider.addEventListener('input', () => {
        animationSpeedValue.textContent = animationSpeedSlider.value;
        updateConfigFromControls();
    });
    resetButton.addEventListener('click', createSpheres);

    window.addEventListener('resize', onWindowResize, false);
}

function updateConfigFromControls() {
    config.algorithm = algorithmSelect.value;
    config.numSpheres = parseInt(numSpheresSlider.value);
    config.sphereSize = parseFloat(sphereSizeSlider.value);
    config.animationSpeed = parseFloat(animationSpeedSlider.value);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (controls) {
        controls.update();
    }

    // Add some subtle animation
    if(config.animationSpeed > 0) {
        spheres.forEach((sphere, i) => {
            const phase = time * config.animationSpeed + i * 0.5;
            sphere.position.y += Math.sin(phase) * 0.005 * config.animationSpeed;
            sphere.rotation.x += 0.01 * delta * config.animationSpeed;
            sphere.rotation.y += 0.01 * delta * config.animationSpeed;
        });
    }

    renderer.render(scene, camera);
}

init();