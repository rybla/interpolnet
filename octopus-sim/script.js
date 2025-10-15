let octopus;
const numSegments = 30;
const segmentLength = 15;
let target;
let repulsionPoints = [];
const numRepulsionPoints = 10;
const repulsionRadius = 100;

function setup() {
  const canvasContainer = document.getElementById('canvas-container');
  const canvas = createCanvas(800, 600);
  canvas.parent(canvasContainer);

  octopus = new Octopus(width / 2, height / 2);

  target = createVector(random(width), random(height));

  for (let i = 0; i < numRepulsionPoints; i++) {
    repulsionPoints.push(createVector(random(width), random(height)));
  }
}

function draw() {
  background(10, 30, 50);

  fill(0, 255, 255, 150);
  noStroke();
  ellipse(target.x, target.y, 20, 20);
  target.x += noise(frameCount * 0.01) * 2 - 1;
  target.y += noise(frameCount * 0.01 + 100) * 2 - 1;
  if (target.x < 0 || target.x > width || target.y < 0 || target.y > height) {
    target.set(random(width), random(height));
  }

  fill(255, 100, 0, 70);
  for (const point of repulsionPoints) {
    ellipse(point.x, point.y, repulsionRadius * 2, repulsionRadius * 2);
  }

  octopus.update(target, repulsionPoints);
  octopus.draw();
}

function mousePressed() {
  target.set(mouseX, mouseY);
}

class Octopus {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.tentacles = [];
    const numTentacles = 8;

    for (let i = 0; i < numTentacles; i++) {
      const angle = (TWO_PI / numTentacles) * i;
      this.tentacles.push(new Tentacle(this.pos.x, this.pos.y, numSegments, segmentLength, angle));
    }
  }

  update(target, repulsionPoints) {
    // Calculate the average position of all tentacle tips
    const averageTipPos = createVector(0, 0);
    for (const tentacle of this.tentacles) {
      const tip = tentacle.segments[tentacle.numSegments - 1];
      averageTipPos.add(tip.pos);
    }
    averageTipPos.div(this.tentacles.length);

    // Apply a force to pull the body towards the average tip position
    const force = p5.Vector.sub(averageTipPos, this.pos);
    // The magnitude of the force is proportional to the distance, with a cap
    force.setMag(constrain(force.mag() * 0.05, 0, 1.5));
    this.vel.add(force);

    // Apply damping to the velocity and update position
    this.vel.mult(0.95);
    this.pos.add(this.vel);

    // Update all tentacles
    for (const tentacle of this.tentacles) {
      tentacle.basePos.set(this.pos); // Link tentacle base to the new body position
      // Pass the list of all tentacles for repulsion calculation
      tentacle.update(target, repulsionPoints, this.tentacles);
    }
  }

  draw() {
    // Draw tentacles first
    for (const tentacle of this.tentacles) {
      tentacle.draw();
    }
    // Draw body on top
    fill(200, 50, 100, 220);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 60, 60);
  }
}

class Segment {
  constructor(x, y) {
    this.pos = createVector(x, y);
  }
}

class Tentacle {
  constructor(x, y, numSegments, segmentLength, angle) {
    this.segments = [];
    this.numSegments = numSegments;
    this.segmentLength = segmentLength;
    this.basePos = createVector(x, y);

    for (let i = 0; i < numSegments; i++) {
      const segX = x + cos(angle) * i * segmentLength;
      const segY = y + sin(angle) * i * segmentLength;
      this.segments.push(new Segment(segX, segY));
    }
  }

  update(target, repulsionPoints, otherTentacles) {
    const tip = this.segments[this.numSegments - 1];
    let totalForce = createVector();

    // Attraction to the main target
    const toTarget = p5.Vector.sub(target, tip.pos);
    totalForce.add(toTarget.setMag(2.5));

    // Repulsion from environmental points
    for (const point of repulsionPoints) {
      const toPoint = p5.Vector.sub(tip.pos, point);
      const distance = toPoint.mag();
      if (distance < repulsionRadius) {
        const repulsionForce = toPoint.setMag(map(distance, 0, repulsionRadius, 5, 0));
        totalForce.add(repulsionForce);
      }
    }

    // Apply the main forces to the tip of the tentacle
    tip.pos.add(totalForce);

    // Inter-tentacle repulsion logic
    const tentacleRepulsionDist = 30;
    const tentacleRepulsionForceMag = 0.8;
    for (const mySegment of this.segments) {
      for (const otherTentacle of otherTentacles) {
        if (otherTentacle === this) continue; // Don't repel self

        for (const otherSegment of otherTentacle.segments) {
          const d = p5.Vector.dist(mySegment.pos, otherSegment.pos);
          if (d > 0 && d < tentacleRepulsionDist) {
            const repulsion = p5.Vector.sub(mySegment.pos, otherSegment.pos);
            repulsion.setMag(map(d, 0, tentacleRepulsionDist, tentacleRepulsionForceMag, 0));
            mySegment.pos.add(repulsion);
          }
        }
      }
    }

    // Update the rest of the segments using inverse kinematics
    for (let i = this.numSegments - 2; i >= 0; i--) {
      const current = this.segments[i];
      const next = this.segments[i + 1];
      const direction = p5.Vector.sub(current.pos, next.pos);
      direction.setMag(this.segmentLength);
      current.pos = p5.Vector.add(next.pos, direction);
    }

    this.segments[0].pos.set(this.basePos); // Use set() to avoid reference issues

    for (let i = 1; i < this.numSegments; i++) {
      const prev = this.segments[i - 1];
      const current = this.segments[i];
      const direction = p5.Vector.sub(current.pos, prev.pos);
      direction.setMag(this.segmentLength);
      current.pos = p5.Vector.add(prev.pos, direction);
    }
  }

  draw() {
    stroke(255, 150, 200, 200);
    for (let i = 1; i < this.segments.length; i++) {
      const prev = this.segments[i - 1];
      const current = this.segments[i];
      strokeWeight(map(i, 0, this.numSegments, 20, 1));
      line(prev.pos.x, prev.pos.y, current.pos.x, current.pos.y);
    }
  }
}
