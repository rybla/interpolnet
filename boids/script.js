
// Basic Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('container').appendChild(renderer.domElement);

camera.position.set(0, 50, 150);
camera.lookAt(0, 0, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Ground
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -50;
ground.receiveShadow = true;
scene.add(ground);

// UI Controls
const separationSlider = document.getElementById('separation');
const alignmentSlider = document.getElementById('alignment');
const cohesionSlider = document.getElementById('cohesion');

// Boids
const boids = [];
const boidCount = 150;
const bounds = { x: 100, y: 50, z: 100 };

class Boid {
    constructor() {
        const geometry = new THREE.ConeGeometry(1, 4, 8);
        geometry.rotateX(Math.PI / 2); // Point the cone forward
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;

        this.mesh.position.set(
            (Math.random() - 0.5) * bounds.x,
            (Math.random() - 0.5) * bounds.y,
            (Math.random() - 0.5) * bounds.z
        );
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() - 0.5),
            (Math.random() - 0.5)
        );
        this.velocity.setLength(Math.random() * 2 + 2); // Random initial speed
        this.acceleration = new THREE.Vector3();

        this.maxForce = 0.05;
        this.maxSpeed = 4;
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    update(boids, separation, alignment, cohesion) {
        this.flock(boids, separation, alignment, cohesion);
        this.wrapToBounds();

        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.mesh.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);

        // Update orientation
        if (this.velocity.length() > 0) {
            this.mesh.lookAt(this.mesh.position.clone().add(this.velocity));
        }
    }

    flock(boids, sep, ali, coh) {
        const separationForce = this.separation(boids).multiplyScalar(sep);
        const alignmentForce = this.alignment(boids).multiplyScalar(ali);
        const cohesionForce = this.cohesion(boids).multiplyScalar(coh);

        this.applyForce(separationForce);
        this.applyForce(alignmentForce);
        this.applyForce(cohesionForce);
    }

    wrapToBounds() {
        if (this.mesh.position.x > bounds.x) this.mesh.position.x = -bounds.x;
        if (this.mesh.position.x < -bounds.x) this.mesh.position.x = bounds.x;
        if (this.mesh.position.y > bounds.y) this.mesh.position.y = -bounds.y;
        if (this.mesh.position.y < -bounds.y) this.mesh.position.y = bounds.y;
        if (this.mesh.position.z > bounds.z) this.mesh.position.z = -bounds.z;
        if (this.mesh.position.z < -bounds.z) this.mesh.position.z = bounds.z;
    }

    seek(target) {
        const desired = new THREE.Vector3().subVectors(target, this.mesh.position);
        desired.setLength(this.maxSpeed);
        const steer = new THREE.Vector3().subVectors(desired, this.velocity);
        steer.clampLength(0, this.maxForce);
        return steer;
    }

    separation(boids) {
        const perceptionRadius = 20;
        const steer = new THREE.Vector3();
        let count = 0;

        for (const other of boids) {
            const d = this.mesh.position.distanceTo(other.mesh.position);
            if (d > 0 && d < perceptionRadius) {
                const diff = new THREE.Vector3().subVectors(this.mesh.position, other.mesh.position);
                diff.normalize();
                diff.divideScalar(d); // Weight by distance
                steer.add(diff);
                count++;
            }
        }

        if (count > 0) {
            steer.divideScalar(count);
        }

        if (steer.length() > 0) {
            steer.setLength(this.maxSpeed);
            steer.sub(this.velocity);
            steer.clampLength(0, this.maxForce);
        }

        return steer;
    }

    alignment(boids) {
        const perceptionRadius = 50;
        const steer = new THREE.Vector3();
        let count = 0;

        for (const other of boids) {
            const d = this.mesh.position.distanceTo(other.mesh.position);
            if (d > 0 && d < perceptionRadius) {
                steer.add(other.velocity);
                count++;
            }
        }

        if (count > 0) {
            steer.divideScalar(count);
            steer.setLength(this.maxSpeed);
            steer.sub(this.velocity);
            steer.clampLength(0, this.maxForce);
        }

        return steer;
    }

    cohesion(boids) {
        const perceptionRadius = 50;
        const target = new THREE.Vector3();
        let count = 0;

        for (const other of boids) {
            const d = this.mesh.position.distanceTo(other.mesh.position);
            if (d > 0 && d < perceptionRadius) {
                target.add(other.mesh.position);
                count++;
            }
        }

        if (count > 0) {
            target.divideScalar(count);
            return this.seek(target);
        }

        return target; // Return zero vector
    }
}

for (let i = 0; i < boidCount; i++) {
    const boid = new Boid();
    boids.push(boid);
    scene.add(boid.mesh);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const separation = separationSlider.value / 50.0;
    const alignment = alignmentSlider.value / 50.0;
    const cohesion = cohesionSlider.value / 50.0;

    for (const boid of boids) {
        boid.update(boids, separation, alignment, cohesion);
    }

    renderer.render(scene, camera);
}

animate();
