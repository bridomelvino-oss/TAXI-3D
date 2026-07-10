import * as THREE from "three";

const GREEN = 0x4ade5c;
const RED = 0xe8453c;

function personSilhouette(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.1, 8), mat);
  body.position.y = 0.75;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat);
  head.position.y = 1.5;
  g.add(head);
  const accent = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.25, 8), new THREE.MeshBasicMaterial({ color }));
  accent.position.y = 1.05;
  g.add(accent);
  return g;
}

export class Marker {
  constructor(scene, kind) {
    this.kind = kind; // "pickup" | "dropoff"
    const color = kind === "pickup" ? GREEN : RED;
    this.group = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.5, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    this.group.add(ring);
    this.ring = ring;

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.5, 6, 10, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    beam.position.y = 3;
    this.group.add(beam);
    this.beam = beam;

    if (kind === "pickup") {
      this.group.add(personSilhouette(color));
    } else {
      const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), new THREE.MeshLambertMaterial({ color: 0x333333 }));
      flagPole.position.y = 1.1;
      this.group.add(flagPole);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.03), new THREE.MeshBasicMaterial({ color }));
      flag.position.set(0.3, 2, 0);
      this.group.add(flag);
    }

    this.group.visible = false;
    scene.add(this.group);
    this._t = 0;
  }

  show(x, z) {
    this.group.position.set(x, 0, z);
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  update(dt) {
    if (!this.group.visible) return;
    this._t += dt;
    const pulse = 1 + Math.sin(this._t * 3.2) * 0.15;
    this.ring.scale.set(pulse, pulse, 1);
    this.group.rotation.y += dt * 0.6;
  }
}
