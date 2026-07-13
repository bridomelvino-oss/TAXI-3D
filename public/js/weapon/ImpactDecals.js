import * as THREE from 'three';

const MAX_DECALS = 150; // limite pour eviter une fuite memoire sur une longue session
const DECAL_RADIUS = 0.13;
const SURFACE_OFFSET = 0.012; // decale la tache le long de la normale, evite le z-fighting

const _up = new THREE.Vector3(0, 0, 1);
const _quaternion = new THREE.Quaternion();

/**
 * Gere les taches de peinture laissees par les impacts : un pool simple avec
 * une limite haute (les plus anciennes sont retirees en premier), pour que le
 * decor se couvre de peinture sans faire fuir la memoire sur une longue partie.
 */
export class ImpactDecals {
  constructor(scene) {
    this.scene = scene;
    this._decals = [];
  }

  spawn(point, normal, color) {
    const geometry = new THREE.CircleGeometry(DECAL_RADIUS * (0.85 + Math.random() * 0.3), 12);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const decal = new THREE.Mesh(geometry, material);

    _quaternion.setFromUnitVectors(_up, normal);
    decal.quaternion.copy(_quaternion);
    decal.rotateZ(Math.random() * Math.PI * 2);
    decal.position.copy(point).addScaledVector(normal, SURFACE_OFFSET);

    this.scene.add(decal);
    this._decals.push(decal);

    if (this._decals.length > MAX_DECALS) {
      const oldest = this._decals.shift();
      this.scene.remove(oldest);
      oldest.geometry.dispose();
      oldest.material.dispose();
    }
  }
}
