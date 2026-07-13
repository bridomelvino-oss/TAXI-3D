import * as THREE from 'three';

const FIRE_COOLDOWN = 0.15; // secondes entre deux tirs (semi-auto, comme un vrai marqueur)
const CAMERA_KICK = 0.012; // rad, kick de camera au tir (purement visuel)
const MAX_RANGE = 100;

const _screenCenter = new THREE.Vector2(0, 0);
const _worldNormal = new THREE.Vector3();

/**
 * Orchestre le tir : raycast instantane depuis le centre de l'ecran (la ou
 * pointe la camera), feedback visuel immediat (arme + camera). La resolution
 * de l'impact (tache de peinture sur le decor, ou signalement d'un tir sur un
 * autre joueur) est deleguee a des callbacks fournis par l'appelant : Shooter
 * ne fait que determiner CE QUI a ete touche, pas ce qu'il faut en faire (le
 * decor et le reseau ne sont pas ses affaires).
 */
export class Shooter {
  constructor({ camera, world, weapon, cameraController, getPlayerMeshes, onWorldHit, onPlayerHit }) {
    this.camera = camera;
    this.world = world;
    this.weapon = weapon;
    this.cameraController = cameraController;
    this.getPlayerMeshes = getPlayerMeshes || (() => []);
    this.onWorldHit = onWorldHit;
    this.onPlayerHit = onPlayerHit;
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
    if (this._cooldown > 0) return null;
    this._cooldown = FIRE_COOLDOWN;

    this.weapon.fire();
    this.cameraController.kick(-CAMERA_KICK);

    this.raycaster.setFromCamera(_screenCenter, this.camera);
    const targets = [...this.world.groundMeshes, ...this.getPlayerMeshes()];
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length === 0) return null;

    const hit = hits[0];
    const playerId = hit.object.userData.playerId;
    if (playerId) {
      this.onPlayerHit?.(playerId, hit.point);
    } else {
      _worldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
      this.onWorldHit?.(hit.point, _worldNormal);
    }
    return hit;
  }
}
