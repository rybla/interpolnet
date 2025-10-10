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

// Reflective Sphere
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({
    envMap: texture
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

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
