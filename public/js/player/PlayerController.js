import * as THREE from 'three';
import { Stickman } from './Stickman.js';
import { resolveHorizontalCollisions, raycastGround } from '../utils/Collision.js';

// Constantes de mouvement, pensees pour un ressenti nerveux type FPS/TPS arcade.
const MAX_SPEED = 6.5; // m/s
const ACCELERATION = 45; // m/s^2 - montee en vitesse rapide
const FRICTION = 14; // m/s^2 - freinage rapide quand on relache les touches
const GRAVITY = -28; // m/s^2
const JUMP_SPEED = 8.5; // m/s, vitesse verticale initiale du saut
const PLAYER_RADIUS = 0.35;
const PLAYER_HEIGHT = 1.7;
const GROUND_PROBE_HEIGHT = 0.5; // origine du rayon sol, au-dessus des pieds
const GROUND_SNAP_DISTANCE = 0.55; // distance max pour rester "colle" au sol

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wishDir = new THREE.Vector3();
const _velocityXZ = new THREE.Vector3();

export class PlayerController {
  constructor(world, spawnPosition, teamColor) {
    this.world = world;
    this.stickman = new Stickman(teamColor);
    this.position = spawnPosition.clone();
    this.velocity = new THREE.Vector3();
    this.grounded = false;
    this.raycaster = new THREE.Raycaster();

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

    if (_wishDir.lengthSq() > 0) {
      _velocityXZ.addScaledVector(_wishDir, ACCELERATION * dt);
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
    if (actions.jump && this.grounded) {
      this.velocity.y = JUMP_SPEED;
      this.grounded = false;
    }

    // --- 4. Integration de la position --------------------------------
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // --- 5. Collision horizontale contre les obstacles ---------------------
    resolveHorizontalCollisions(this.position, PLAYER_RADIUS, PLAYER_HEIGHT, this.world.obstacleBoxes);

    // --- 6. Detection du sol (raycast vers le bas) -------------------------
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

    // --- 7. Application au mesh : position + orientation (face a la camera) --
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = facingYaw;

    // --- 8. Animation procedurale ------------------------------------------
    this.stickman.update(dt, {
      speed: _velocityXZ.length(),
      maxSpeed: MAX_SPEED,
      grounded: this.grounded,
      verticalVelocity: this.velocity.y,
    });
  }
}
