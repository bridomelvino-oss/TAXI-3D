import * as THREE from 'three';

const FIRE_COOLDOWN = 0.15; // secondes entre deux tirs (semi-auto, comme un vrai marqueur)
const CAMERA_KICK = 0.012; // rad, kick de camera au tir (purement visuel)
const MAX_RANGE = 100;

const _screenCenter = new THREE.Vector2(0, 0);
const _worldNormal = new THREE.Vector3();

/**
 * Orchestre le tir : raycast instantane depuis le centre de l'ecran (la ou
 * pointe la camera), feedback visuel immediat (arme + camera), tache de
 * peinture a l'impact. Le raycast se fait au moment du clic : aucune attente
 * reseau, la reactivite locale est totale (le solo n'a pas d'autorite
 * serveur - elle arrivera en Phase 4 pour les impacts sur les autres joueurs).
 */
export class Shooter {
  constructor({ camera, world, weapon, decals, cameraController, teamColor }) {
    this.camera = camera;
    this.world = world;
    this.weapon = weapon;
    this.decals = decals;
    this.cameraController = cameraController;
    this.teamColor = teamColor;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = MAX_RANGE;
    this._cooldown = 0;
  }

  update(dt) {
    if (this._cooldown > 0) this._cooldown -= dt;
    this.weapon.update(dt);
  }

  /** Tente un tir ; ne fait rien si le cooldown n'est pas ecoule. */
  tryFire() {
    if (this._cooldown > 0) return;
    this._cooldown = FIRE_COOLDOWN;

    this.weapon.fire();
    this.cameraController.kick(-CAMERA_KICK);

    this.raycaster.setFromCamera(_screenCenter, this.camera);
    const hits = this.raycaster.intersectObjects(this.world.groundMeshes, false);
    if (hits.length === 0) return null;

    const hit = hits[0];
    _worldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
    this.decals.spawn(hit.point, _worldNormal, this.teamColor);
    return hit;
  }
}
