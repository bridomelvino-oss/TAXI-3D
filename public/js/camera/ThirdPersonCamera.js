import * as THREE from 'three';

const MOUSE_SENSITIVITY = 0.0022;
const MIN_PITCH = -Math.PI / 2 + 0.2; // regarder vers le haut
const MAX_PITCH = Math.PI / 2 - 0.35; // regarder vers le bas
const DISTANCE = 5.2; // distance ideale derriere le personnage
const PIVOT_HEIGHT = 1.5; // hauteur visee (approx. epaules/tete)
const COLLISION_MARGIN = 0.3; // recul apres impact, pour ne pas coller a la surface
const MIN_DISTANCE = 0.6; // distance mini si la camera est tres proche d'un mur
const POSITION_SMOOTH_TIME = 0.06; // secondes, lissage tres court (anti-jitter, pas de lag percu)

const _pivot = new THREE.Vector3();
const _desiredOffset = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

/**
 * Camera 3e personne orbitale : la souris pilote le regard (reactif, sans
 * lissage), tandis que la position de la camera est lissee et corrigee par
 * un raycast pour eviter de traverser le decor (technique du "spring arm").
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = -0.15;
    this.raycaster = new THREE.Raycaster();

    // Position actuelle lissee de la camera (init au premier update)
    this._currentPos = null;
  }

  /** Applique le mouvement souris a l'orientation (immediat, pas de lissage). */
  applyMouseDelta(deltaX, deltaY) {
    this.yaw -= deltaX * MOUSE_SENSITIVITY;
    this.pitch -= deltaY * MOUSE_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(this.pitch, MIN_PITCH, MAX_PITCH);
  }

  /**
   * Repositionne la camera autour de `targetPosition` (pieds du joueur).
   * @param {THREE.Vector3} targetPosition
   * @param {THREE.Mesh[]} obstacleMeshes - pour la collision de la camera
   * @param {number} dt
   */
  update(targetPosition, obstacleMeshes, dt) {
    _pivot.set(targetPosition.x, targetPosition.y + PIVOT_HEIGHT, targetPosition.z);

    // Offset spherique derriere le personnage, selon yaw/pitch
    const horizontalDist = Math.cos(this.pitch) * DISTANCE;
    _desiredOffset.set(
      -Math.sin(this.yaw) * horizontalDist,
      Math.sin(-this.pitch) * DISTANCE,
      -Math.cos(this.yaw) * horizontalDist
    );
    _desiredCamPos.copy(_pivot).add(_desiredOffset);

    // Collision : raycast du pivot vers la position ideale de la camera
    let finalDistance = DISTANCE;
    _rayDir.subVectors(_desiredCamPos, _pivot);
    const idealLength = _rayDir.length();
    _rayDir.normalize();

    this.raycaster.set(_pivot, _rayDir);
    this.raycaster.far = idealLength;
    const hits = this.raycaster.intersectObjects(obstacleMeshes, false);
    if (hits.length > 0) {
      finalDistance = Math.max(hits[0].distance - COLLISION_MARGIN, MIN_DISTANCE);
    }

    _desiredCamPos.copy(_pivot).addScaledVector(_rayDir, finalDistance);

    if (!this._currentPos) {
      this._currentPos = _desiredCamPos.clone();
    } else {
      // Lissage exponentiel independant du framerate (evite les a-coups de collision
      // sans introduire de latence perceptible sur le suivi).
      const alpha = 1 - Math.exp(-dt / POSITION_SMOOTH_TIME);
      this._currentPos.lerp(_desiredCamPos, alpha);
    }

    this.camera.position.copy(this._currentPos);

    _lookTarget.copy(_pivot);
    this.camera.lookAt(_lookTarget);
  }
}
