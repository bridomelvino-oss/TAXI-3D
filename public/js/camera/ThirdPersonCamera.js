import * as THREE from 'three';

const MOUSE_SENSITIVITY = 0.0020;
const MIN_PITCH = -Math.PI / 2 + 0.2; // limite basse (regarder vers le haut)
const MAX_PITCH = Math.PI / 2 - 0.35; // limite haute (regarder vers le bas)
const DISTANCE = 5.2; // distance ideale derriere le personnage
const PIVOT_HEIGHT = 1.5; // hauteur visee (approx. epaules/tete)
const COLLISION_MARGIN = 0.3; // recul apres impact, pour ne pas coller a la surface
const MIN_DISTANCE = 0.6; // distance mini si la camera est tres proche d'un mur
const POSITION_SMOOTH_TIME = 0.07; // secondes, lissage court (anti-jitter, pas de lag percu)

// Lissage tres leger du delta souris brut : les evenements mousemove arrivent
// par paquets irreguliers (polling rate variable, trackpad, etc.), ce qui donne
// une sensation saccadee ("lutter contre la camera") si on les applique bruts.
// Un lissage court (quelques millisecondes) absorbe ce bruit sans ajouter de
// latence perceptible a la visee.
const MOUSE_SMOOTH_TIME = 0.035;

const _pivot = new THREE.Vector3();
const _desiredOffset = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

/**
 * Camera 3e personne orbitale : la souris pilote le regard (tres reactif,
 * juste assez lisse pour ne pas etre saccade), tandis que la position de la
 * camera est lissee et corrigee par un raycast pour eviter de traverser le
 * decor (technique du "spring arm").
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = -0.15;
    this.raycaster = new THREE.Raycaster();

    // Delta souris lisse, accumule frame par frame avant d'etre applique
    this._smoothDeltaX = 0;
    this._smoothDeltaY = 0;

    // Position actuelle lissee de la camera (init au premier update)
    this._currentPos = null;
  }

  /**
   * Enregistre le mouvement souris brut de la frame (avant lissage).
   * A appeler une fois par frame, meme si le delta est nul.
   */
  applyMouseDelta(deltaX, deltaY, dt) {
    const alpha = 1 - Math.exp(-dt / MOUSE_SMOOTH_TIME);
    this._smoothDeltaX += (deltaX - this._smoothDeltaX) * alpha;
    this._smoothDeltaY += (deltaY - this._smoothDeltaY) * alpha;

    this.yaw -= this._smoothDeltaX * MOUSE_SENSITIVITY;
    this.pitch -= this._smoothDeltaY * MOUSE_SENSITIVITY;
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
