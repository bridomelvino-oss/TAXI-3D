import * as THREE from 'three';
import { Stickman } from './Stickman.js';
import { resolveHorizontalCollisions, raycastGround } from '../utils/Collision.js';

// Constantes de mouvement, pensees pour un ressenti nerveux et agile (arcade,
// pas simulation realiste) : montee en vitesse rapide, freinage franc, un
// peu de derapage dans les demi-tours brusques.
const MAX_SPEED = 7.2; // m/s
const ACCELERATION = 52; // m/s^2 - montee en vitesse
const FRICTION = 18; // m/s^2 - freinage quand on relache les touches
const TURN_BRAKE_BOOST = 2.4; // multiplicateur de freinage lors d'un demi-tour brusque (derapage)
const AIR_CONTROL_FACTOR = 0.55; // controle horizontal reduit en l'air (sensation de poids)
const GRAVITY = -30; // m/s^2
const JUMP_SPEED = 9.2; // m/s, vitesse verticale initiale du saut
const PLAYER_RADIUS = 0.35;
const PLAYER_HEIGHT = 1.7;
const GROUND_PROBE_HEIGHT = 0.5; // origine du rayon sol, au-dessus des pieds
const GROUND_SNAP_DISTANCE = 0.55; // distance max pour rester "colle" au sol

// Le corps du personnage tourne vers la camera de maniere lissee (pas de
// "snap" instantane) : plus naturel visuellement, sans jamais affecter la
// direction de deplacement ni la visee (qui restent basees sur `facingYaw`
// brut, donc toujours precises et instantanees).
const VISUAL_TURN_SPEED = 14; // rad/s, vitesse de rattrapage de l'orientation visuelle

// Amplitude du lean (inclinaison) du corps selon l'acceleration/le virage
const LEAN_FORWARD_AMOUNT = 0.18; // rad
const LEAN_SIDE_AMOUNT = 0.22; // rad
const LEAN_SMOOTH_SPEED = 9; // rad/s

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wishDir = new THREE.Vector3();
const _velocityXZ = new THREE.Vector3();

/** Ramene une difference d'angle dans [-PI, PI] (chemin le plus court). */
function shortestAngleDiff(from, to) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export class PlayerController {
  constructor(world, spawnPosition, teamColor) {
    this.world = world;
    this.stickman = new Stickman(teamColor);
    this.position = spawnPosition.clone();
    this.velocity = new THREE.Vector3();
    this.grounded = false;
    this.raycaster = new THREE.Raycaster();

    this.visualYaw = 0;
    this.leanForward = 0;
    this.leanSide = 0;
    this.wasGrounded = true;
    this.justJumped = false;
    this.landingImpact = 0; // vitesse de chute au moment de l'atterrissage (pour le squash)

    this.stickman.mesh.position.copy(this.position);
  }

  get mesh() {
    return this.stickman.mesh;
  }

  /**
   * @param {number} dt - delta time en secondes
   * @param {object} actions - etat des touches (InputManager.actions)
   * @param {number} facingYaw - orientation horizontale de la camera, utilisee
   *   comme reference pour le "avant" du joueur (deplacement camera-relatif).
   */
  update(dt, actions, facingYaw) {
    // --- 1. Direction souhaitee, relative a la camera ---------------------
    _forward.set(Math.sin(facingYaw), 0, Math.cos(facingYaw));
    _right.set(Math.sin(facingYaw + Math.PI / 2), 0, Math.cos(facingYaw + Math.PI / 2));

    _wishDir.set(0, 0, 0);
    if (actions.forward) _wishDir.add(_forward);
    if (actions.backward) _wishDir.sub(_forward);
    if (actions.right) _wishDir.add(_right);
    if (actions.left) _wishDir.sub(_right);
    if (_wishDir.lengthSq() > 0) _wishDir.normalize();

    // --- 2. Acceleration / friction horizontales (independantes du framerate) --
    _velocityXZ.set(this.velocity.x, 0, this.velocity.z);
    const speedBefore = _velocityXZ.length();
    const accel = this.grounded ? ACCELERATION : ACCELERATION * AIR_CONTROL_FACTOR;

    if (_wishDir.lengthSq() > 0) {
      // Derapage : si on inverse brutalement la direction (ex: on freine pile
      // pour repartir en arriere), on freine plus fort avant de repartir,
      // ce qui donne une sensation de plante-pied/glissade plutot que de
      // changer de direction comme un robot sur pivot.
      if (speedBefore > 0.5) {
        const facingDot = _velocityXZ.dot(_wishDir) / speedBefore;
        if (facingDot < -0.2) {
          const brake = speedBefore * FRICTION * TURN_BRAKE_BOOST * dt;
          const newSpeed = Math.max(speedBefore - brake, 0);
          _velocityXZ.multiplyScalar(newSpeed > 0 ? newSpeed / speedBefore : 0);
        }
      }
      _velocityXZ.addScaledVector(_wishDir, accel * dt);
      if (_velocityXZ.length() > MAX_SPEED) {
        _velocityXZ.setLength(MAX_SPEED);
      }
    } else {
      const speed = _velocityXZ.length();
      if (speed > 0) {
        const drop = speed * FRICTION * dt;
        const newSpeed = Math.max(speed - drop, 0);
        _velocityXZ.multiplyScalar(speed > 0 ? newSpeed / speed : 0);
      }
    }

    this.velocity.x = _velocityXZ.x;
    this.velocity.z = _velocityXZ.z;

    // --- 3. Gravite + saut -------------------------------------------------
    this.velocity.y += GRAVITY * dt;
    this.justJumped = false;
    if (actions.jump && this.grounded) {
      this.velocity.y = JUMP_SPEED;
      this.grounded = false;
      this.justJumped = true;
    }

    // --- 4. Integration de la position --------------------------------
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // --- 5. Collision horizontale contre les obstacles ---------------------
    resolveHorizontalCollisions(this.position, PLAYER_RADIUS, PLAYER_HEIGHT, this.world.obstacleBoxes);

    // --- 6. Detection du sol (raycast vers le bas) -------------------------
    const fallSpeedBeforeLanding = this.velocity.y;
    const hit = raycastGround(
      this.raycaster,
      this.position,
      this.world.groundMeshes,
      GROUND_PROBE_HEIGHT,
      GROUND_SNAP_DISTANCE
    );

    if (hit && this.velocity.y <= 0) {
      this.position.y = hit.point.y;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    // Vient d'atterrir : on retient la vitesse de chute pour doser le squash
    this.landingImpact = !this.wasGrounded && this.grounded ? -fallSpeedBeforeLanding : 0;
    this.wasGrounded = this.grounded;

    // --- 7. Orientation visuelle du corps : rattrape la camera en douceur --
    // (la direction de deplacement ci-dessus utilise `facingYaw` brut, donc
    // la reactivite de la visee n'est jamais affectee par ce lissage)
    const yawDiff = shortestAngleDiff(this.visualYaw, facingYaw);
    const maxStep = VISUAL_TURN_SPEED * dt;
    this.visualYaw += THREE.MathUtils.clamp(yawDiff, -maxStep, maxStep);

    // --- 8. Lean (inclinaison) selon l'acceleration et le virage ------------
    // Avant/arriere : proportionnel a l'acceleration ressentie sur l'axe de
    // deplacement (on penche en avant en accelerant, en arriere en freinant).
    const forwardSpeed = _velocityXZ.dot(_forward);
    const sideSpeed = _velocityXZ.dot(_right);
    const accelForward = (forwardSpeed - (this._prevForwardSpeed ?? forwardSpeed)) / Math.max(dt, 0.0001);
    this._prevForwardSpeed = forwardSpeed;

    const targetLean = THREE.MathUtils.clamp(-accelForward / 40, -1, 1) * LEAN_FORWARD_AMOUNT;
    // Lateral : penche dans le sens du virage, comme un appui en courbe.
    const targetSideLean = THREE.MathUtils.clamp(-sideSpeed / MAX_SPEED, -1, 1) * LEAN_SIDE_AMOUNT;

    const leanAlpha = 1 - Math.exp(-LEAN_SMOOTH_SPEED * dt);
    this.leanForward += (targetLean - this.leanForward) * leanAlpha;
    this.leanSide += (targetSideLean - this.leanSide) * leanAlpha;

    // --- 9. Application au mesh : position + orientation lissee -----------
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.visualYaw;

    // --- 10. Animation procedurale ------------------------------------------
    this.stickman.update(dt, {
      speed: _velocityXZ.length(),
      maxSpeed: MAX_SPEED,
      grounded: this.grounded,
      verticalVelocity: this.velocity.y,
      justJumped: this.justJumped,
      landingImpact: this.landingImpact,
      leanForward: this.leanForward,
      leanSide: this.leanSide,
    });
  }
}
