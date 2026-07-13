import * as THREE from "three";
import { COLORS } from "./config.js";
import { getLayout } from "./layout.js";
import { createSoftShadowTexture } from "./textures.js";

// ---- shared geometries / materials (reused across instances for perf) ----
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 10, 8),
  shadowBlob: new THREE.PlaneGeometry(1, 1),
};

function stdMat(color, roughness = 0.85, metalness = 0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

const mat = {
  colonial: stdMat(COLORS.colonialWhite, 0.75),
  laterite: stdMat(COLORS.laterite, 0.8),
  tin: stdMat(COLORS.tin, 0.55, 0.3),
  wood: stdMat(COLORS.wood, 0.9),
  glass: stdMat(COLORS.glass, 0.15, 0.2, { transparent: true, opacity: 0.55 }),
  vegDark: stdMat(COLORS.vegDark, 0.85),
  vegLight: stdMat(COLORS.vegLight, 0.85),
  palmLeaf: stdMat(0x5c9a4c, 0.8),
  trunk: stdMat(0x6b4a2f, 0.9),
  asphalt: stdMat(COLORS.asphalt, 0.95),
  tarmac: stdMat(0x323238, 0.9),
  roadLine: new THREE.MeshBasicMaterial({ color: COLORS.roadLine }),
  sidewalk: stdMat(COLORS.sidewalk, 0.9),
  sand: stdMat(0xe8d8a8, 0.95),
  water: stdMat(COLORS.water, 0.25, 0.15, { transparent: true, opacity: 0.92 }),
  bay: stdMat(COLORS.water, 0.2, 0.15, { transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
  marketRed: stdMat(COLORS.marketRed, 0.7),
  marketBlue: stdMat(COLORS.marketBlue, 0.7),
  marketGreen: stdMat(COLORS.marketGreen, 0.7),
  marketOrange: stdMat(COLORS.marketOrange, 0.7),
  hullBlue: stdMat(0x2f5c73, 0.6, 0.2),
  hullRed: stdMat(0x8a3324, 0.6, 0.2),
  lampPole: stdMat(0x2b2b2b, 0.5, 0.4),
  lampGlow: new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  umbrellaRed: stdMat(0xc0392b, 0.7),
  umbrellaBlue: stdMat(0x2d6a8f, 0.7),
  wheel: stdMat(0x1c1c1c, 0.6, 0.1),
  shadowBlob: new THREE.MeshBasicMaterial({
    map: createSoftShadowTexture(),
    transparent: true,
    depthWrite: false,
  }),
  carBody: [stdMat(0x7a3b3b, 0.45, 0.15), stdMat(0x3b5a7a, 0.45, 0.15), stdMat(0x3b7a4c, 0.45, 0.15)],
};

/** Cheap fake-AO / contact-shadow decal, flat on the ground under a prop. */
function groundShadow(x, z, radius) {
  const m = new THREE.Mesh(geo.shadowBlob, mat.shadowBlob);
  m.scale.set(radius * 2, radius * 2, 1);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.015, z);
  return m;
}

/** Slightly jitters a base color's lightness so repeated buildings don't look cloned. */
function tintedStdMat(baseColor, roughness, jitter = 0.06) {
  const c = new THREE.Color(baseColor);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + (Math.random() * 2 - 1) * jitter, 0.05, 0.95));
  return stdMat(c, roughness);
}

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(geo.box, material);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cylinder(r, h, material, x, y, z) {
  const m = new THREE.Mesh(geo.cylinder, material);
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Splits a zone rect into a small internal grid of sub-block centers (local, relative to zone center). */
function subBlocks(zone, cols, rows, gap = 5) {
  const totalW = zone.halfW * 2;
  const totalD = zone.halfD * 2;
  const cellW = (totalW - gap * (cols - 1)) / cols;
  const cellD = (totalD - gap * (rows - 1)) / rows;
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({
        x: zone.center.x - totalW / 2 + cellW / 2 + c * (cellW + gap),
        z: zone.center.z - totalD / 2 + cellD / 2 + r * (cellD + gap),
        w: cellW,
        d: cellD,
      });
    }
  }
  return out;
}

function zoneCurbPoints(zone, sides = ["n", "s", "e", "w"], margin = 2.5) {
  const { x: cx, z: cz } = zone.center;
  const map = {
    n: { x: cx, z: cz - zone.halfD - margin },
    s: { x: cx, z: cz + zone.halfD + margin },
    e: { x: cx + zone.halfW + margin, z: cz },
    w: { x: cx - zone.halfW - margin, z: cz },
  };
  return sides.map((s) => map[s]);
}

function sidewalkAround(scene, cx, cz, halfW, halfD) {
  const t = 0.6;
  const y = 0.12;
  scene.add(box(halfW * 2 + t * 2, 0.24, t, mat.sidewalk, cx, y, cz - halfD - t / 2));
  scene.add(box(halfW * 2 + t * 2, 0.24, t, mat.sidewalk, cx, y, cz + halfD + t / 2));
  scene.add(box(t, 0.24, halfD * 2, mat.sidewalk, cx - halfW - t / 2, y, cz));
  scene.add(box(t, 0.24, halfD * 2, mat.sidewalk, cx + halfW - t / 2 + t, y, cz));
}

// ---------------------------------------------------------------------------
// Decorative / reusable props
// ---------------------------------------------------------------------------

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
  g.add(groundShadow(0, 0, 2.4 * scale));
  g.position.set(x, 0, z);
  return g;
}

function palmTree(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunkH = 4.2 * scale;
  const trunk = cylinder(0.22 * scale, trunkH, mat.trunk, 0, trunkH / 2, 0);
  trunk.rotation.z = 0.12;
  g.add(trunk);
  const frondCount = 6;
  for (let i = 0; i < frondCount; i++) {
    const a = (i / frondCount) * Math.PI * 2;
    const frond = box(0.35 * scale, 0.06 * scale, 2.2 * scale, mat.palmLeaf, 0, trunkH + 0.1 * scale, 1.1 * scale);
    frond.rotation.y = a;
    frond.rotation.x = -0.5;
    frond.position.set(Math.sin(a) * 0.5 * scale, trunkH + 0.1 * scale, Math.cos(a) * 0.5 * scale);
    g.add(frond);
  }
  g.add(groundShadow(0, 0, 1.1 * scale));
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
      const wheel = cylinder(0.35, 0.3, mat.wheel, sx, 0.35, sz);
      wheel.rotation.z = Math.PI / 2;
      g.add(wheel);
    }
  }
  g.add(groundShadow(0, 0, 2.6));
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
  g.add(groundShadow(0, 0, 2.6 * scale));
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * 0.4 - 0.2;
  return g;
}

function beachUmbrella(x, z, colorMat) {
  const g = new THREE.Group();
  g.add(cylinder(0.06, 2.2, mat.wood, 0, 1.1, 0));
  const canopy = new THREE.Mesh(geo.cone, colorMat);
  canopy.scale.set(1.4, 0.8, 1.4);
  canopy.position.set(0, 2.3, 0);
  canopy.castShadow = true;
  g.add(canopy);
  g.add(groundShadow(0, 0, 1.3));
  g.position.set(x, 0, z);
  return g;
}

// ---------------------------------------------------------------------------
// Zone-specific buildings
// ---------------------------------------------------------------------------

/** Dense narrow multi-storey buildings typical of a port / old-town block. */
function oldTownBlock(cx, cz, w, d, colliders) {
  const g = new THREE.Group();
  const cols = 3;
  const bw = (w - (cols - 1) * 1.4) / cols;
  const bd = d * 0.75;
  for (let i = 0; i < cols; i++) {
    const dx = -w / 2 + bw / 2 + i * (bw + 1.4);
    const h = 3.2 + Math.random() * 2;
    const wallMat = tintedStdMat(i % 2 === 0 ? COLORS.colonialWhite : COLORS.laterite, 0.8);
    g.add(box(bw, h, bd, wallMat, dx, h / 2, 0));
    g.add(box(bw + 0.3, 0.3, bd + 0.3, mat.laterite, dx, h + 0.15, 0));
    g.add(box(bw * 0.55, 0.6, 0.06, mat.glass, dx, h * 0.62, bd / 2 + 0.03));
    g.add(groundShadow(dx, 0, Math.max(bw, bd) * 0.6));
    colliders.push({
      minX: cx + dx - bw / 2,
      maxX: cx + dx + bw / 2,
      minZ: cz - bd / 2,
      maxZ: cz + bd / 2,
    });
  }
  g.position.set(cx, 0, cz);
  return g;
}

/** Rectangular colonial administrative building with an arcade colonnade. */
function adminBuilding(cx, cz, colliders) {
  const g = new THREE.Group();
  const w = 14,
    d = 10,
    h = 6;
  g.add(box(w, h, d, mat.colonial, 0, h / 2, 0));
  g.add(box(w + 1, 0.6, d + 1, mat.laterite, 0, h + 0.3, 0));
  const archCount = 5;
  for (let k = 0; k < archCount; k++) {
    const cx2 = -w / 2 + (w / (archCount - 1)) * k;
    g.add(cylinder(0.35, 4.2, mat.colonial, cx2, 2.1, -d / 2 - 0.4));
  }
  g.add(box(w + 0.6, 0.4, 1.2, mat.colonial, 0, 4.4, -d / 2 - 0.4));
  g.add(box(2.4, 1.6, 2.4, mat.colonial, 0, h + 1.1, 2));
  const roofCone = new THREE.Mesh(geo.cone, mat.laterite);
  roofCone.scale.set(1.9, 1.4, 1.9);
  roofCone.position.set(0, h + 2.6, 2);
  g.add(roofCone);
  g.add(groundShadow(0, 0, 9));

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
  g.add(groundShadow(0, 0, 3.2));
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
  const wallMat = tintedStdMat(Math.random() > 0.5 ? COLORS.wood : COLORS.laterite, 0.9);
  g.add(box(w, h, d, wallMat, 0, h / 2, 0));
  const roof = box(w + 0.6, 0.3, d + 0.6, mat.tin, 0, h + 0.3, 0);
  g.add(roof);
  const roofCap = box(w * 0.6, 0.7, 0.4, mat.tin, 0, h + 0.7, 0);
  roofCap.rotation.x = Math.PI / 2;
  g.add(roofCap);
  g.add(groundShadow(0, 0, Math.max(w, d) * 0.65));
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

function hotelBuilding(cx, cz, colliders) {
  const g = new THREE.Group();
  const w = 9,
    d = 8,
    h = 9;
  g.add(box(w, h, d, mat.colonial, 0, h / 2, 0));
  for (let level = 1; level <= 3; level++) {
    g.add(box(w + 0.6, 0.22, d + 0.6, mat.laterite, 0, level * (h / 4), 0));
  }
  g.add(box(w + 0.8, 0.4, d + 0.8, mat.laterite, 0, h + 0.2, 0));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 20), mat.water);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.03, d / 2 + 4.2);
  g.add(pool);
  g.add(groundShadow(0, 0, 6));
  g.position.set(cx, 0, cz);
  colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  return g;
}

function runway(cx, cz, length, width) {
  const g = new THREE.Group();
  g.add(box(width, 0.05, length, mat.tarmac, 0, 0.025, 0));
  const dashCount = Math.max(6, Math.floor(length / 7));
  for (let i = 0; i < dashCount; i++) {
    const dz = -length / 2 + (length / dashCount) * (i + 0.5);
    g.add(box(0.3, 0.06, (length / dashCount) * 0.5, mat.roadLine, 0, 0.05, dz));
  }
  g.position.set(cx, 0, cz);
  return g;
}

function terminalBuilding(cx, cz, colliders) {
  const g = new THREE.Group();
  const w = 12,
    d = 5,
    h = 3.6;
  g.add(box(w, h, d, mat.colonial, 0, h / 2, 0));
  g.add(box(w + 0.5, 0.3, d + 0.5, mat.laterite, 0, h + 0.15, 0));
  g.add(cylinder(1.1, 5.5, mat.colonial, w / 2 - 1.5, 2.75, 0));
  g.add(box(1.6, 1.2, 1.6, mat.glass, w / 2 - 1.5, 5.6, 0));
  g.add(groundShadow(0, 0, 7));
  g.position.set(cx, 0, cz);
  colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  return g;
}

function airplaneProp(x, z, rotY) {
  const g = new THREE.Group();
  const fuselage = cylinder(0.55, 6, mat.colonial, 0, 1.1, 0);
  fuselage.rotation.x = Math.PI / 2;
  g.add(fuselage);
  const nose = new THREE.Mesh(geo.cone, mat.colonial);
  nose.rotation.x = -Math.PI / 2;
  nose.scale.set(0.55, 1.1, 0.55);
  nose.position.set(0, 1.1, 3.1);
  g.add(nose);
  g.add(box(7, 0.15, 1.1, mat.laterite, 0, 1.1, 0.2));
  g.add(box(0.15, 1.4, 1.1, mat.laterite, 0, 1.9, -2.9));
  g.add(box(2.4, 0.12, 0.7, mat.laterite, 0, 1.5, -2.8));
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function plaza(cx, cz) {
  const g = new THREE.Group();
  const radius = 8;
  const curb = new THREE.Mesh(new THREE.RingGeometry(radius - 0.5, radius, 32), mat.sidewalk);
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

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------

function roadSegment(from, to, width = 9) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const g = new THREE.Group();
  g.add(box(width, 0.05, length, mat.asphalt, 0, 0.025, 0));
  const dashCount = Math.max(4, Math.floor(length / 6));
  for (let i = 0; i < dashCount; i++) {
    const dz2 = -length / 2 + (length / dashCount) * (i + 0.5);
    g.add(box(0.25, 0.06, (length / dashCount) * 0.5, mat.roadLine, 0, 0.05, dz2));
  }
  g.position.set((from.x + to.x) / 2, 0, (from.z + to.z) / 2);
  g.rotation.y = angle;
  return g;
}

// ---------------------------------------------------------------------------
// Zone builders — each mutates `group`/`colliders` and returns pickup/dropoff
// curb points plus the zone metadata used by the HUD/minimap.
// ---------------------------------------------------------------------------

function buildVilleBasse(zone, group, colliders) {
  sidewalkAround(group, zone.center.x, zone.center.z, zone.halfW, zone.halfD);
  for (const b of subBlocks(zone, 2, 1)) {
    group.add(oldTownBlock(b.x, b.z, b.w, b.d, colliders));
  }
  // port flavor: boats moored along the bay-facing (east) edge
  const edgeX = zone.center.x + zone.halfW + 3.5;
  group.add(boat(edgeX, zone.center.z - 6, mat.hullBlue, 0.9));
  group.add(boat(edgeX, zone.center.z + 6, mat.hullRed, 0.8));
  group.add(palmTree(edgeX - 1.5, zone.center.z, 1.1));
  return zoneCurbPoints(zone, ["n", "s", "w"]);
}

function buildPlateau(zone, group, colliders) {
  sidewalkAround(group, zone.center.x, zone.center.z, zone.halfW, zone.halfD);
  const [a, b] = subBlocks(zone, 2, 1);
  group.add(plaza(a.x, a.z));
  group.add(adminBuilding(b.x, b.z, colliders));
  const plazaPoints = zoneCurbPoints({ center: { x: a.x, z: a.z }, halfW: 6.5, halfD: 6.5 });
  return { points: zoneCurbPoints(zone), plazaCenter: { x: a.x, z: a.z }, extraPoints: plazaPoints };
}

function buildTanambao(zone, group, colliders) {
  sidewalkAround(group, zone.center.x, zone.center.z, zone.halfW, zone.halfD);
  for (const b of subBlocks(zone, 2, 1)) {
    group.add(marketBlock(b.x, b.z, colliders));
  }
  return zoneCurbPoints(zone);
}

function buildBordDeMer(zone, group, colliders) {
  sidewalkAround(group, zone.center.x, zone.center.z, zone.halfW, zone.halfD);
  for (const b of subBlocks(zone, 2, 1)) {
    group.add(hotelBuilding(b.x, b.z, colliders));
  }
  const edgeX = zone.center.x + zone.halfW + 2;
  group.add(box(4, 0.05, zone.halfD * 1.8, mat.sand, edgeX, 0.025, zone.center.z));
  group.add(beachUmbrella(edgeX, zone.center.z - 5, mat.umbrellaRed));
  group.add(beachUmbrella(edgeX, zone.center.z + 2, mat.umbrellaBlue));
  group.add(palmTree(edgeX + 1.5, zone.center.z - 8, 1));
  group.add(palmTree(edgeX + 1.2, zone.center.z + 6.5, 0.85));
  return zoneCurbPoints(zone, ["n", "s", "w"]);
}

function buildPeripherie(zone, group, colliders) {
  sidewalkAround(group, zone.center.x, zone.center.z, zone.halfW, zone.halfD);
  for (const b of subBlocks(zone, 2, 1)) {
    group.add(residentialBlock(b.x, b.z, colliders));
  }
  return zoneCurbPoints(zone);
}

function buildAeroport(zone, group, colliders) {
  const length = zone.halfW * 2 * 0.85;
  group.add(runway(zone.center.x, zone.center.z, length, 7));
  const terminalX = zone.center.x - zone.halfW + 6.5;
  group.add(terminalBuilding(terminalX, zone.center.z + zone.halfD - 3, colliders));
  group.add(airplaneProp(zone.center.x + 6, zone.center.z, Math.PI / 2));
  group.add(lamppost(zone.center.x - zone.halfW - 1, zone.center.z - zone.halfD - 1));
  return zoneCurbPoints(zone, ["n", "s", "w"]);
}

const ZONE_BUILDERS = {
  ville_basse: buildVilleBasse,
  plateau: buildPlateau,
  tanambao: buildTanambao,
  bord_de_mer: buildBordDeMer,
  peripherie: buildPeripherie,
  aeroport: buildAeroport,
};

/**
 * Builds the full city of Andalatra from the Diego-Suarez-inspired layout
 * (src/data/andalatraLayout.json) and returns useful references:
 * - group: THREE.Group containing all city meshes
 * - colliders: array of AABB rectangles for collision (buildings + terminal)
 * - polygons: array of point lists the taxi may never enter (the bay)
 * - spawnZones: named areas used to place passenger/dropoff markers
 * - bounds: drivable area bounds
 * - plazaCenter: taxi start position (Plateau roundabout)
 */
export function buildCity(scene) {
  const layout = getLayout();
  const group = new THREE.Group();
  const colliders = [];
  const spawnZones = [];
  let plazaCenter = { x: 0, z: 0 };

  const extent = layout.mapRadius + 20;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(extent * 2, extent * 2), mat.asphalt);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  for (const road of layout.roads) {
    group.add(roadSegment(road.from, road.to));
  }

  for (const zone of layout.zones) {
    const builder = ZONE_BUILDERS[zone.id];
    if (!builder) continue;
    const result = builder(zone, group, colliders);

    if (zone.id === "plateau") {
      plazaCenter = result.plazaCenter;
      spawnZones.push({ name: zone.id, x: zone.center.x, z: zone.center.z, points: [...result.points, ...result.extraPoints] });
    } else {
      spawnZones.push({ name: zone.id, x: zone.center.x, z: zone.center.z, points: result });
    }
  }

  // ---- Bay ----
  const bayShape = new THREE.Shape();
  layout.bay.forEach((p, i) => {
    if (i === 0) bayShape.moveTo(p.x, p.z);
    else bayShape.lineTo(p.x, p.z);
  });
  bayShape.closePath();
  const bayMesh = new THREE.Mesh(new THREE.ShapeGeometry(bayShape), mat.bay);
  // ShapeGeometry lies in local XY; rotating +90° about X maps local (x,y) -> world (x,0,y),
  // matching the {x,z} polygon coordinates used for collision below exactly.
  bayMesh.rotation.x = Math.PI / 2;
  bayMesh.position.y = 0.02;
  bayMesh.receiveShadow = true;
  group.add(bayMesh);

  scene.add(group);

  const drivableBounds = {
    minX: -extent + 4,
    maxX: extent - 4,
    minZ: -extent + 4,
    maxZ: extent - 4,
  };

  return {
    group,
    colliders,
    polygons: [layout.bay],
    spawnZones,
    bounds: drivableBounds,
    plazaCenter,
    mapRadius: layout.mapRadius,
  };
}

let waterTime = 0;
const BASE_WATER_OPACITY = 0.92;

/** Gentle shimmer for the bay/pool water — call once per frame from the render loop. */
export function updateCityAnimations(dt) {
  waterTime += dt;
  const shimmer = BASE_WATER_OPACITY - 0.05 + Math.sin(waterTime * 0.6) * 0.04;
  mat.water.opacity = shimmer;
  mat.bay.opacity = shimmer;
  const tint = 0.5 + Math.sin(waterTime * 0.6) * 0.5;
  mat.water.roughness = 0.2 + tint * 0.1;
  mat.bay.roughness = mat.water.roughness;
}
