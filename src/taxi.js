import * as THREE from "three";
import { COLORS, PHYSICS } from "./config.js";

function buildTaxiMesh() {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.taxiYellow, roughness: 0.35, metalness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: COLORS.taxiYellowDark, roughness: 0.4, metalness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: COLORS.glass,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
  });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5, metalness: 0.3 });
  const checkerMat = new THREE.MeshBasicMaterial({ color: 0x1c1c1c });

  // main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.2), bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  g.add(body);

  // lower skirt
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.32, 4.25), darkMat);
  skirt.position.y = 0.28;
  g.add(skirt);

  // cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 2.1), bodyMat);
  cabin.position.set(0, 1.28, -0.15);
  cabin.castShadow = true;
  g.add(cabin);

  // windshield + windows
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.08), glassMat);
  windshield.position.set(0, 1.28, 0.92);
  windshield.rotation.x = -0.25;
  g.add(windshield);
  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.08), glassMat);
  rearWindow.position.set(0, 1.28, -1.22);
  rearWindow.rotation.x = 0.25;
  g.add(rearWindow);
  for (const side of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.7), glassMat);
    win.position.set(side * 0.93, 1.28, -0.15);
    g.add(win);
  }

  // roof sign (taxi light)
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  sign.position.set(0, 1.72, -0.15);
  g.add(sign);

  // checker stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.12, 4.22), checkerMat);
  stripe.position.y = 0.62;
  g.add(stripe);
  const stripeYellowTop = new THREE.Mesh(new THREE.BoxGeometry(2.11, 0.06, 4.21), bodyMat);
  stripeYellowTop.position.y = 0.68;
  g.add(stripeYellowTop);

  // bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.3, 0.3), darkMat);
  frontBumper.position.set(0, 0.35, 2.1);
  g.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.z = -2.1;
  g.add(rearBumper);

  // headlights / taillights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xaa2222 });
  for (const side of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.08), headMat);
    head.position.set(side, 0.62, 2.12);
    g.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.08), tailMat);
    tail.position.set(side, 0.62, -2.12);
    g.add(tail);
  }

  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 14);
  const wheelPositions = [
    [-1.02, 0.42, 1.35],
    [1.02, 0.42, 1.35],
    [-1.02, 0.42, -1.35],
    [1.02, 0.42, -1.35],
  ];
  const wheels = [];
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, blackMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    g.add(wheel);
    wheels.push(wheel);
  }

  return { group: g, wheels, frontWheels: [wheels[0], wheels[1]] };
}

export class Taxi {
  constructor(scene) {
    const { group, wheels, frontWheels } = buildTaxiMesh();
    this.mesh = group;
    this.wheels = wheels;
    this.frontWheels = frontWheels;
    scene.add(this.mesh);

    this.position = new THREE.Vector3(0, 0, 0);
    this.heading = 0; // radians, 0 = facing +z
    this.speed = 0; // signed, +forward / -reverse
    this.radius = 1.6; // approx collision radius
  }

  setSpawn(x, z, heading = 0) {
    this.position.set(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this._syncMesh();
  }

  update(dt, input, colliders, bounds, polygons) {
    const p = PHYSICS;

    // ---- acceleration / braking / friction ----
    if (input.forward && !input.backward) {
      this.speed += p.acceleration * dt;
    } else if (input.backward && !input.forward) {
      this.speed -= p.acceleration * dt;
    } else {
      // natural friction toward 0
      const decel = p.friction * dt;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - decel);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + decel);
    }

    if (input.handbrake) {
      const decel = p.handbrakeDeceleration * dt;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - decel);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + decel);
    }

    this.speed = THREE.MathUtils.clamp(this.speed, -p.reverseMaxSpeed, p.maxSpeed);

    // ---- steering (scaled by speed so the car doesn't spin in place) ----
    const speedRatio = THREE.MathUtils.clamp(Math.abs(this.speed) / p.maxSpeed, 0.18, 1);
    let turnInput = 0;
    if (input.left) turnInput += 1;
    if (input.right) turnInput -= 1;
    const turnDir = this.speed < 0 ? -1 : 1;
    this.heading += turnInput * p.turnSpeed * speedRatio * turnDir * dt;

    // steering wheel visual rotation
    const steerAngle = turnInput * 0.4;
    for (const w of this.frontWheels) w.rotation.y = steerAngle;

    // ---- integrate position ----
    const dx = Math.sin(this.heading) * this.speed * dt;
    const dz = Math.cos(this.heading) * this.speed * dt;
    const nextX = this.position.x + dx;
    const nextZ = this.position.z + dz;

    const resolved = this._resolveCollisions(nextX, nextZ, colliders, bounds, polygons);
    this.position.x = resolved.x;
    this.position.z = resolved.z;
    if (resolved.hit) this.speed *= 0.35;

    // wheel spin
    const spin = (this.speed * dt) / 0.42;
    for (const w of this.wheels) w.rotation.x += spin;

    this._syncMesh();
  }

  _resolveCollisions(x, z, colliders, bounds, polygons) {
    let hit = false;
    let rx = x;
    let rz = z;

    if (bounds) {
      if (rx < bounds.minX) {
        rx = bounds.minX;
        hit = true;
      }
      if (rx > bounds.maxX) {
        rx = bounds.maxX;
        hit = true;
      }
      if (rz < bounds.minZ) {
        rz = bounds.minZ;
        hit = true;
      }
      if (rz > bounds.maxZ) {
        rz = bounds.maxZ;
        hit = true;
      }
    }

    const r = this.radius;
    for (const c of colliders) {
      const closestX = THREE.MathUtils.clamp(rx, c.minX, c.maxX);
      const closestZ = THREE.MathUtils.clamp(rz, c.minZ, c.maxZ);
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < r * r) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const push = r - dist;
        rx += (dx / dist) * push;
        rz += (dz / dist) * push;
        hit = true;
      }
    }

    if (polygons) {
      for (const poly of polygons) {
        if (pointInPolygon(rx, rz, poly)) {
          const nearest = closestPointOnPolygon(rx, rz, poly);
          rx = nearest.x;
          rz = nearest.z;
          hit = true;
        }
      }
    }

    return { x: rx, z: rz, hit };
  }

  _syncMesh() {
    this.mesh.position.set(this.position.x, 0, this.position.z);
    this.mesh.rotation.y = this.heading;
  }
}

function pointInPolygon(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x,
      zi = points[i].z,
      xj = points[j].x,
      zj = points[j].z;
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function closestPointOnPolygon(x, z, points) {
  let best = null;
  let bestDistSq = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const lenSq = abx * abx + abz * abz || 1;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / lenSq;
    t = THREE.MathUtils.clamp(t, 0, 1);
    const px = a.x + abx * t;
    const pz = a.z + abz * t;
    const distSq = (x - px) ** 2 + (z - pz) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = { x: px, z: pz };
    }
  }
  return best;
}
