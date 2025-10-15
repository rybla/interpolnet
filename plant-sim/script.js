
import * as THREE from "three";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.getElementById("main-canvas");

let renderer;
if (window.WebGPURenderingContext) {
  renderer = new WebGPURenderer({ canvas, antialias: true });
} else {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
}
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.z = 20;

const controls = new OrbitControls(camera, canvas);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

let simulationId = 0;
let isRunning = false;
let plant;
let currentLSystemString;
let currentIteration;
let lastStepTime = 0;

const simulations = [
  {
    // 3D Fractal Tree
    rules: {
      F: "F[+&F][--&F][^/F][\\\\&F]",
    },
    angle: 20,
    axiom: "F",
    iterations: 4,
  },
  {
    // 3D Bush
    rules: {
      X: "F-[[X]+X]+F[+FX]-X",
      F: "FF",
    },
    angle: 25,
    axiom: "X",
    iterations: 5,
  },
  {
    // 3D Spiral
    rules: {
      F: "F[+F]F[-F]F&",
    },
    angle: 30,
    axiom: "F",
    iterations: 5,
  },
  {
    // Weeping Willow
    rules: {
      F: "FF+[+F-F-F&]-[-F+F+F&]",
    },
    angle: 22.5,
    axiom: "F",
    iterations: 4,
  },
  {
    // Conifer
    rules: {
      F: "F[+F][-F][^F][&F]",
    },
    angle: 30,
    axiom: "F",
    iterations: 4,
  },
  {
    // Feathery Bush
    rules: {
      X: "F[+X]F[-X]+X",
      F: "FF",
    },
    angle: 20,
    axiom: "X",
    iterations: 5,
  },
  {
    // Twisted Growth
    rules: {
      F: "F/F\\F[+F&-F]",
    },
    angle: 25,
    axiom: "F",
    iterations: 4,
  },
  {
    // Coral-like Structure
    rules: {
      X: "F&[+X][^X]F&[+X][^X]",
      F: "FF",
    },
    angle: 20,
    axiom: "X",
    iterations: 4,
  },
  {
    // Complex Flower
    rules: {
      X: "F[+XF][^XF]F[-XF][/XF]",
      F: "FF",
    },
    angle: 15,
    axiom: "X",
    iterations: 5,
  },
  {
    // Spiral Fern
    rules: {
      X: "F[^F][&F][+F][-F]FX",
    },
    angle: 10,
    axiom: "X",
    iterations: 5,
  },
  {
    // Crystal Formation
    rules: {
      F: "FF[^F][&F]F",
    },
    angle: 45,
    axiom: "F-F-F-F",
    iterations: 3,
  },
  {
    // Sea Anemone
    rules: {
      F: "F[+F&-F^F\\F/F]",
    },
    angle: 20,
    axiom: "F",
    iterations: 4,
  },
  {
    // Dragon Tree
    rules: {
      X: "F[-^X][+&X]FX",
      F: "FF",
    },
    angle: 20,
    axiom: "X",
    iterations: 5,
  },
  {
    // Windswept Tree
    rules: {
      F: "F[+F&-F&]F/",
    },
    angle: 15,
    axiom: "F",
    iterations: 4,
  },
  {
    // Alien Plant
    rules: {
      X: "F\\F[+X][^X]/F[-X][&X]",
      F: "FF",
    },
    angle: 25,
    axiom: "X",
    iterations: 4,
  },
];

function createPlantGeometry(lSystemString, angle) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const position = new THREE.Vector3(0, -10, 0);
  const stack = [];

  // H: heading, U: up, L: left
  let H = new THREE.Vector3(0, 1, 0);
  let U = new THREE.Vector3(0, 0, 1);
  let L = new THREE.Vector3(1, 0, 0);

  const radAngle = THREE.MathUtils.degToRad(angle);

  for (const char of lSystemString) {
    if (char === "F") {
      vertices.push(position.x, position.y, position.z);
      position.add(H);
      vertices.push(position.x, position.y, position.z);
    } else if (char === "+") { // Yaw right
      H.applyAxisAngle(U, radAngle);
      L.applyAxisAngle(U, radAngle);
    } else if (char === "-") { // Yaw left
      H.applyAxisAngle(U, -radAngle);
      L.applyAxisAngle(U, -radAngle);
    } else if (char === "&") { // Pitch down
      H.applyAxisAngle(L, radAngle);
      U.applyAxisAngle(L, radAngle);
    } else if (char === "^") { // Pitch up
      H.applyAxisAngle(L, -radAngle);
      U.applyAxisAngle(L, -radAngle);
    } else if (char === "\\") { // Roll left
      L.applyAxisAngle(H, radAngle);
      U.applyAxisAngle(H, radAngle);
    } else if (char === "/") { // Roll right
      L.applyAxisAngle(H, -radAngle);
      U.applyAxisAngle(H, -radAngle);
    } else if (char === "[") {
      stack.push({
        position: position.clone(),
        H: H.clone(),
        U: U.clone(),
        L: L.clone(),
      });
    } else if (char === "]") {
      const state = stack.pop();
      position.copy(state.position);
      H.copy(state.H);
      U.copy(state.U);
      L.copy(state.L);
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

function updatePlant() {
  if (plant) {
    scene.remove(plant);
  }
  const simulation = simulations[simulationId];
  const plantGeometry = createPlantGeometry(currentLSystemString, simulation.angle);
  const plantMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  plant = new THREE.LineSegments(plantGeometry, plantMaterial);
  scene.add(plant);
}

function stepSimulation() {
  const simulation = simulations[simulationId];
  if (currentIteration >= simulation.iterations) {
    isRunning = false;
    return;
  }

  let nextString = "";
  for (const char of currentLSystemString) {
    nextString += simulation.rules[char] || char;
  }
  currentLSystemString = nextString;
  currentIteration++;
  updatePlant();
}

function resetSimulation() {
  isRunning = false;
  currentIteration = 0;
  const simulation = simulations[simulationId];
  currentLSystemString = simulation.axiom;
  updatePlant();
}

document.getElementById("simulation-select").addEventListener("change", (event) => {
  simulationId = parseInt(event.target.value);
  resetSimulation();
});

document.getElementById("start-button").addEventListener("click", () => {
  isRunning = true;
});

document.getElementById("step-button").addEventListener("click", () => {
  if (!isRunning) {
    stepSimulation();
  }
});

document.getElementById("pause-button").addEventListener("click", () => {
  isRunning = false;
});

document.getElementById("reset-button").addEventListener("click", () => {
  resetSimulation();
});

function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();
  if (isRunning && now - lastStepTime > 500) {
    stepSimulation();
    lastStepTime = now;
  }

  controls.update();
  renderer.render(scene, camera);
}

resetSimulation();
animate();
