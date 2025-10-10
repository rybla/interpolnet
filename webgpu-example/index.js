import * as THREE from 'three';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const canvas = document.getElementById('webgpu-canvas');
const renderer = new WebGPURenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Environment (Skybox)
const loader = new THREE.CubeTextureLoader();
const texture = loader.load([
  "./xpos.png",
  "./xneg.png",
  "./ypos.png",
  "./yneg.png",
  "./zpos.png",
  "./zneg.png",
]);
scene.background = texture;

// Dynamic Reflection
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
scene.add(cubeCamera);

// Reflective Sphere
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({
    envMap: cubeRenderTarget.texture,
    metalness: 1,
    roughness: 0.8
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 20);
pointLight.position.set(2, 2, 2);
scene.add(pointLight);

const pointLight2 = new THREE.PointLight(0xff00ff, 15);
pointLight2.position.set(-2, -2, 2);
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0x0000ff, 15);
pointLight3.position.set(2, -2, -2);
scene.add(pointLight3);

const pointLight4 = new THREE.PointLight(0xff0000, 15);
pointLight4.position.set(-2, 2, -2);
scene.add(pointLight4);

// Particle System
const particleCount = 1000;
const particles = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const color = new THREE.Color();

for (let i = 0; i < particleCount * 3; i += 3) {
    const radius = 3 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = radius * Math.cos(phi);

    color.setHSL(Math.random(), 0.7, 0.7);
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
}

particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particleMaterial = new THREE.PointsMaterial({
    size: 0.25,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 1.0
});

const particleSystem = new THREE.Points(particles, particleMaterial);
const originalPositions = positions.slice();
const particleData = [];

for (let i = 0; i < particleCount; i++) {
    particleData.push({
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        ),
        originalY: originalPositions[i * 3 + 1]
    });
}
scene.add(particleSystem);


// Mouse interaction for rotation
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const rotationSpeed = 3;
let cameraAngle = { theta: 0, phi: Math.PI / 2 };
const cameraRadius = 5;

function updateCameraPosition() {
    camera.position.x = cameraRadius * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
    camera.position.y = cameraRadius * Math.cos(cameraAngle.phi);
    camera.position.z = cameraRadius * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
    camera.lookAt(scene.position);
}

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    cameraAngle.theta += (deltaX / window.innerWidth) * Math.PI * rotationSpeed;
    cameraAngle.phi -= (deltaY / window.innerHeight) * Math.PI * rotationSpeed;
    cameraAngle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngle.phi));

    previousMousePosition = { x: e.clientX, y: e.clientY };
    updateCameraPosition();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

// Animation loop
function animate() {
    const time = Date.now() * 0.001;
    const positionAttribute = particles.getAttribute('position');

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Linear motion
        positionAttribute.array[i3] += particleData[i].velocity.x;
        positionAttribute.array[i3 + 1] += particleData[i].velocity.y;
        positionAttribute.array[i3 + 2] += particleData[i].velocity.z;

        // Sinusoidal oscillation
        positionAttribute.array[i3 + 1] += Math.sin(time + i) * 0.01;


        // Reset particles that move too far away
        const distance = Math.sqrt(
            positionAttribute.array[i3] ** 2 +
            positionAttribute.array[i3 + 1] ** 2 +
            positionAttribute.array[i3 + 2] ** 2
        );

        if (distance > 6) {
            positionAttribute.array[i3] = originalPositions[i3];
            positionAttribute.array[i3 + 1] = originalPositions[i3 + 1];
            positionAttribute.array[i3 + 2] = originalPositions[i3 + 2];
        }
    }
    positionAttribute.needsUpdate = true;


    // Dynamic reflection
    sphere.visible = false;
    cubeCamera.update(renderer, scene);
    sphere.visible = true;

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initial setup
updateCameraPosition();
