import * as THREE from "three";
import { COLORS, BLOCK_SIZE, ROAD_WIDTH, CELL, GRID_N, HALF_SPAN } from "./config.js";

// ---- shared geometries / materials (reused across instances for perf) ----
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 10, 8),
};

const mat = {
  colonial: new THREE.MeshLambertMaterial({ color: COLORS.colonialWhite }),
  laterite: new THREE.MeshLambertMaterial({ color: COLORS.laterite }),
  tin: new THREE.MeshLambertMaterial({ color: COLORS.tin }),
  wood: new THREE.MeshLambertMaterial({ color: COLORS.wood }),
  glass: new THREE.MeshLambertMaterial({
    color: COLORS.glass,
    transparent: true,
    opacity: 0.55,
  }),
  vegDark: new THREE.MeshLambertMaterial({ color: COLORS.vegDark }),
  vegLight: new THREE.MeshLambertMaterial({ color: COLORS.vegLight }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x6b4a2f }),
  asphalt: new THREE.MeshLambertMaterial({ color: COLORS.asphalt }),
  roadLine: new THREE.MeshBasicMaterial({ color: COLORS.roadLine }),
  sidewalk: new THREE.MeshLambertMaterial({ color: COLORS.sidewalk }),
  water: new THREE.MeshLambertMaterial({ color: COLORS.water, transparent: true, opacity: 0.92 }),
  marketRed: new THREE.MeshLambertMaterial({ color: COLORS.marketRed }),
  marketBlue: new THREE.MeshLambertMaterial({ color: COLORS.marketBlue }),
  marketGreen: new THREE.MeshLambertMaterial({ color: COLORS.marketGreen }),
  marketOrange: new THREE.MeshLambertMaterial({ color: COLORS.marketOrange }),
  hullBlue: new THREE.MeshLambertMaterial({ color: 0x2f5c73 }),
  hullRed: new THREE.MeshLambertMaterial({ color: 0x8a3324 }),
  lampPole: new THREE.MeshLambertMaterial({ color: 0x2b2b2b }),
  lampGlow: new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  carBody: [
    new THREE.MeshLambertMaterial({ color: 0x7a3b3b }),
    new THREE.MeshLambertMaterial({ color: 0x3b5a7a }),
    new THREE.MeshLambertMaterial({ color: 0x3b7a4c }),
  ],
};

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(geo.box, material);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cylinder(r, h, material, x, y, z, radialSegments) {
  const m = new THREE.Mesh(geo.cylinder, material);
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function blockCenter(i, j) {
  const offset = (GRID_N - 1) / 2;
  return {
    x: (i - offset) * CELL,
    z: (j - offset) * CELL,
  };
}

/** Curb points around a block, safely on the road/sidewalk (not inside building footprints). */
function curbPoints(cx, cz, sides = ["n", "s", "e", "w"]) {
  const d = BLOCK_SIZE / 2 + 2.2;
  const map = {
    n: { x: cx, z: cz - d },
    s: { x: cx, z: cz + d },
    e: { x: cx + d, z: cz },
    w: { x: cx - d, z: cz },
  };
  return sides.map((s) => map[s]);
}

function baobab(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunkH = 3.2 * scale;
  const trunk = cylinder(0.55 * scale, trunkH, mat.trunk, 0, trunkH / 2, 0);
  trunk.scale.set(0.55 * scale, trunkH, 0.75 * scale);
  g.add(trunk);
  const canopy = new THREE.Mesh(geo.sphere, mat.vegDark);
  canopy.scale.set(2.1 * scale, 1.5 * scale, 2.1 * scale);
  canopy.position.set(0, trunkH + 0.9 * scale, 0);
  canopy.castShadow = true;
  g.add(canopy);
  const canopy2 = new THREE.Mesh(geo.sphere, mat.vegLight);
  canopy2.scale.set(1.5 * scale, 1.1 * scale, 1.5 * scale);
  canopy2.position.set(0.6 * scale, trunkH + 1.6 * scale, 0.3 * scale);
  canopy2.castShadow = true;
  g.add(canopy2);
  g.position.set(x, 0, z);
  return g;
}

function lamppost(x, z) {
  const g = new THREE.Group();
  g.add(cylinder(0.08, 4, mat.lampPole, 0, 2, 0));
  const arm = box(1, 0.08, 0.08, mat.lampPole, 0.4, 3.9, 0);
  g.add(arm);
  const glow = new THREE.Mesh(geo.sphere, mat.lampGlow);
  glow.scale.set(0.22, 0.22, 0.22);
  glow.position.set(0.8, 3.85, 0);
  g.add(glow);
  g.position.set(x, 0, z);
  return g;
}

function parkedCar(x, z, rotY, colorIdx) {
  const g = new THREE.Group();
  const body = box(2, 0.7, 4, mat.carBody[colorIdx % mat.carBody.length], 0, 0.55, 0);
  g.add(body);
  const cabin = box(1.7, 0.55, 2, mat.glass, 0, 1.15, -0.2);
  g.add(cabin);
  for (const sx of [-0.9, 0.9]) {
    for (const sz of [-1.3, 1.3]) {
      const wheel = cylinder(0.35, 0.3, new THREE.MeshLambertMaterial({ color: 0x1c1c1c }), sx, 0.35, sz);
      wheel.rotation.z = Math.PI / 2;
      g.add(wheel);
    }
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function boat(x, z, hullMat, scale = 1) {
  const g = new THREE.Group();
  const hull = box(1.6 * scale, 0.9 * scale, 4.5 * scale, hullMat, 0, 0.45 * scale, 0);
  g.add(hull);
  const cabin = box(1 * scale, 0.9 * scale, 1.4 * scale, mat.colonial, 0, 1.2 * scale, -0.6 * scale);
  g.add(cabin);
  const mast = cylinder(0.05 * scale, 3 * scale, mat.trunk, 0, 2.4 * scale, 0.6 * scale);
  g.add(mast);
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * 0.4 - 0.2;
  return g;
}

/**
 * Builds a rectangular colonial administrative building with an arcade colonnade.
 */
function adminBuilding(cx, cz, colliders) {
  const g = new THREE.Group();
  const w = 14,
    d = 10,
    h = 6;
  g.add(box(w, h, d, mat.colonial, 0, h / 2, 0));
  // roof
  g.add(box(w + 1, 0.6, d + 1, mat.laterite, 0, h + 0.3, 0));
  // arcade colonnade along front (facing -z, toward plaza)
  const archCount = 5;
  for (let k = 0; k < archCount; k++) {
    const cx2 = -w / 2 + (w / (archCount - 1)) * k;
    g.add(cylinder(0.35, 4.2, mat.colonial, cx2, 2.1, -d / 2 - 0.4));
  }
  g.add(box(w + 0.6, 0.4, 1.2, mat.colonial, 0, 4.4, -d / 2 - 0.4));
  // pediment / clock tower accent
  g.add(box(2.4, 1.6, 2.4, mat.colonial, 0, h + 1.1, 2));
  g.add(new THREE.Mesh(geo.cone, mat.laterite));
  const roofCone = g.children[g.children.length - 1];
  roofCone.scale.set(1.9, 1.4, 1.9);
  roofCone.position.set(0, h + 2.6, 2);

  g.position.set(cx, 0, cz);
  colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  return g;
}

function marketStall(x, z, rotY, colorMat) {
  const g = new THREE.Group();
  g.add(box(4, 0.2, 4, mat.sidewalk, 0, 0.1, 0));
  for (const [sx, sz] of [
    [-1.7, -1.7],
    [1.7, -1.7],
    [-1.7, 1.7],
    [1.7, 1.7],
  ]) {
    g.add(cylinder(0.08, 2.4, mat.wood, sx, 1.2, sz));
  }
  const roof = box(4.6, 0.25, 4.6, colorMat, 0, 2.5, 0);
  roof.rotation.y = Math.PI / 8;
  g.add(roof);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function marketBlock(cx, cz, colliders) {
  const g = new THREE.Group();
  const colors = [mat.marketRed, mat.marketBlue, mat.marketGreen, mat.marketOrange];
  const positions = [
    [-6, -6],
    [6, -6],
    [-6, 6],
    [6, 6],
    [0, 0],
  ];
  positions.forEach(([dx, dz], idx) => {
    g.add(marketStall(dx, dz, (idx * Math.PI) / 6, colors[idx % colors.length]));
  });
  g.position.set(cx, 0, cz);
  colliders.push({ minX: cx - 9, maxX: cx + 9, minZ: cz - 9, maxZ: cz + 9 });
  return g;
}

function residentialHouse(x, z, rotY) {
  const g = new THREE.Group();
  const w = 4 + Math.random() * 1.5;
  const d = 3.5 + Math.random() * 1.5;
  const h = 2.4 + Math.random() * 0.6;
  const wallMat = Math.random() > 0.5 ? mat.wood : mat.laterite;
  g.add(box(w, h, d, wallMat, 0, h / 2, 0));
  const roof = box(w + 0.6, 0.3, d + 0.6, mat.tin, 0, h + 0.3, 0);
  g.add(roof);
  const roofCap = box(w * 0.6, 0.7, 0.4, mat.tin, 0, h + 0.7, 0);
  roofCap.rotation.x = Math.PI / 2;
  g.add(roofCap);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return { group: g, w, d };
}

function residentialBlock(cx, cz, colliders) {
  const g = new THREE.Group();
  const layout = [
    [-5, -5],
    [5, -5],
    [-5, 5],
    [5, 5],
  ];
  layout.forEach(([dx, dz]) => {
    const rot = Math.random() * Math.PI * 2;
    const { group, w, d } = residentialHouse(dx, dz, rot);
    g.add(group);
    colliders.push({
      minX: cx + dx - w / 2,
      maxX: cx + dx + w / 2,
      minZ: cz + dz - d / 2,
      maxZ: cz + dz + d / 2,
    });
  });
  g.position.set(cx, 0, cz);
  return g;
}

function harborShed(cx, cz, colliders) {
  const g = new THREE.Group();
  const w = 8,
    d = 6,
    h = 3.4;
  g.add(box(w, h, d, mat.laterite, 0, h / 2, 0));
  const roof = box(w + 0.6, 0.3, d + 1, mat.tin, 0, h + 0.3, 0);
  g.add(roof);
  g.position.set(cx, 0, cz);
  colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  return g;
}

function plaza(cx, cz) {
  const g = new THREE.Group();
  const radius = 8;
  const curb = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.5, radius, 32),
    mat.sidewalk
  );
  curb.rotation.x = -Math.PI / 2;
  curb.position.y = 0.05;
  g.add(curb);
  const centerDisc = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.5, 32), mat.vegLight);
  centerDisc.rotation.x = -Math.PI / 2;
  centerDisc.position.y = 0.04;
  g.add(centerDisc);

  g.add(baobab(0, 0, 1.3));
  const ring = 5.2;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    g.add(baobab(Math.cos(a) * ring, Math.sin(a) * ring, 0.8));
  }
  g.position.set(cx, 0, cz);
  return g;
}

function roadNetwork(scene, extentHalf) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(extentHalf * 2.4, extentHalf * 2.4), mat.asphalt);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // sidewalks around each block footprint + lane markings along grid lines
  const offset = (GRID_N - 1) / 2;
  for (let i = -1; i <= GRID_N; i++) {
    const x = (i - offset) * CELL;
    const line = box(0.25, 0.02, extentHalf * 2.2, mat.roadLine, x, 0.03, 0);
    scene.add(line);
  }
  for (let j = -1; j <= GRID_N; j++) {
    const z = (j - offset) * CELL;
    const line = box(extentHalf * 2.2, 0.02, 0.25, mat.roadLine, 0, 0.03, z);
    scene.add(line);
  }
}

function sidewalkAround(scene, cx, cz, halfW, halfD) {
  const t = 0.6;
  const y = 0.12;
  scene.add(box(halfW * 2 + t * 2, 0.24, t, mat.sidewalk, cx, y, cz - halfD - t / 2));
  scene.add(box(halfW * 2 + t * 2, 0.24, t, mat.sidewalk, cx, y, cz + halfD + t / 2));
  scene.add(box(t, 0.24, halfD * 2, mat.sidewalk, cx - halfW - t / 2, y, cz));
  scene.add(box(t, 0.24, halfD * 2, mat.sidewalk, cx + halfW - t / 2 + t, y, cz));
}

/**
 * Builds the full city of Andalatra and returns useful references:
 * - group: THREE.Group containing all city meshes
 * - colliders: array of AABB rectangles for collision (buildings + water edge)
 * - spawnZones: named areas used to place passenger/dropoff markers
 * - bounds: drivable area bounds
 */
export function buildCity(scene) {
  const group = new THREE.Group();
  const colliders = [];
  const spawnZones = [];

  const PLAZA = { i: 1, j: 1 };
  const ADMIN = { i: 2, j: 1 };
  const MARKET = [
    { i: 1, j: 2 },
    { i: 2, j: 2 },
  ];
  const WATERFRONT_ROW = 3;

  roadNetwork(scene, HALF_SPAN + CELL);

  for (let i = 0; i < GRID_N; i++) {
    for (let j = 0; j < GRID_N; j++) {
      const { x, z } = blockCenter(i, j);

      if (i === PLAZA.i && j === PLAZA.j) {
        group.add(plaza(x, z));
        const ring = 6.5;
        const points = [0, 1, 2, 3].map((k) => {
          const a = (k / 4) * Math.PI * 2;
          return { x: x + Math.cos(a) * ring, z: z + Math.sin(a) * ring };
        });
        spawnZones.push({ name: "plaza", x, z, points });
        continue;
      }

      if (i === ADMIN.i && j === ADMIN.j) {
        group.add(adminBuilding(x, z, colliders));
        sidewalkAround(group, x, z, BLOCK_SIZE / 2, BLOCK_SIZE / 2);
        spawnZones.push({ name: "admin", x, z, points: curbPoints(x, z) });
        continue;
      }

      if (MARKET.some((m) => m.i === i && m.j === j)) {
        group.add(marketBlock(x, z, colliders));
        sidewalkAround(group, x, z, BLOCK_SIZE / 2, BLOCK_SIZE / 2);
        spawnZones.push({ name: "market", x, z, points: curbPoints(x, z) });
        continue;
      }

      if (j === WATERFRONT_ROW) {
        group.add(harborShed(x, z - 4, colliders));
        group.add(baobab(x - 7, z + 6, 0.9));
        sidewalkAround(group, x, z, BLOCK_SIZE / 2, BLOCK_SIZE / 2);
        spawnZones.push({ name: "waterfront", x, z, points: curbPoints(x, z, ["s", "e", "w"]) });
        continue;
      }

      group.add(residentialBlock(x, z, colliders));
      sidewalkAround(group, x, z, BLOCK_SIZE / 2, BLOCK_SIZE / 2);
      spawnZones.push({ name: "residential", x, z, points: curbPoints(x, z) });

      // decorative lamppost / occasional parked car
      if ((i + j) % 2 === 0) {
        group.add(lamppost(x - BLOCK_SIZE / 2 - 2, z));
      }
      if ((i + j) % 3 === 0) {
        group.add(parkedCar(x + BLOCK_SIZE / 2 - 3, z + BLOCK_SIZE / 2 - 3, Math.PI / 2, i + j));
      }
    }
  }

  // lampposts along plaza-adjacent streets
  for (let i = 0; i < GRID_N; i++) {
    const { x } = blockCenter(i, 0);
    group.add(lamppost(x, -HALF_SPAN - 3));
  }

  // ---- Waterfront: bay beyond the northern edge ----
  const waterZ0 = blockCenter(0, WATERFRONT_ROW).z + BLOCK_SIZE / 2 + ROAD_WIDTH / 2;
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(HALF_SPAN * 4, HALF_SPAN * 3), mat.water);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, -0.15, waterZ0 + HALF_SPAN * 1.5);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // quay curb along the waterfront
  group.add(box(HALF_SPAN * 2.6, 0.4, 1, mat.sidewalk, 0, 0.2, waterZ0));

  // boats
  const boatSpots = [-30, -10, 12, 34];
  boatSpots.forEach((bx, idx) => {
    group.add(boat(bx, waterZ0 + 10 + (idx % 2) * 6, idx % 2 === 0 ? mat.hullBlue : mat.hullRed, 1 + (idx % 2) * 0.3));
  });

  // Water collider: block driving past the quay curb into the bay
  colliders.push({
    minX: -HALF_SPAN * 2,
    maxX: HALF_SPAN * 2,
    minZ: waterZ0 - 0.5,
    maxZ: waterZ0 + HALF_SPAN * 3,
    isEdge: true,
  });

  scene.add(group);

  const drivableBounds = {
    minX: -HALF_SPAN - CELL * 0.9,
    maxX: HALF_SPAN + CELL * 0.9,
    minZ: -HALF_SPAN - CELL * 0.9,
    maxZ: waterZ0 - 1,
  };

  return { group, colliders, spawnZones, bounds: drivableBounds, plazaCenter: blockCenter(PLAZA.i, PLAZA.j) };
}
