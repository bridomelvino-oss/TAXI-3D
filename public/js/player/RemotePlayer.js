import { Stickman } from './Stickman.js';

const POSITION_SMOOTH_TIME = 0.09; // secondes - lisse les paquets reseau (~50Hz) en mouvement continu
const MAX_SNAP_DISTANCE = 4; // si l'ecart est trop grand (spawn, gros lag), on "teleporte" au lieu de lisser

/**
 * Represente un autre joueur du salon : pas de physique ni d'entree locale,
 * seulement une interpolation vers le dernier etat recu du serveur. C'est ce
 * qui rend les mouvements des joueurs distants fluides malgre des paquets
 * reseau qui n'arrivent qu'une vingtaine de fois par seconde.
 */
export class RemotePlayer {
  constructor(id, team, teamColor, spawnPosition) {
    this.id = id;
    this.team = team;
    this.stickman = new Stickman(teamColor);
    this.position = spawnPosition.clone();
    this.stickman.mesh.position.copy(this.position);
    this.visualYaw = 0;
    this.alive = true;

    this._targetPosition = spawnPosition.clone();
    this._targetYaw = 0;
    this._targetState = { speed: 0, maxSpeed: 1, grounded: true, verticalVelocity: 0 };
  }

  /** Replace instantanement le joueur distant (debut de manche), sans lissage. */
  teleport(position) {
    this.position.copy(position);
    this._targetPosition.copy(position);
    this.mesh.position.copy(position);
  }

  get mesh() {
    return this.stickman.mesh;
  }

  /** Enregistre le dernier etat recu du serveur (a appeler a chaque paquet). */
  applyNetworkState(state) {
    this._targetPosition.set(state.x, state.y, state.z);
    this._targetYaw = state.yaw;
    this._targetState = {
      speed: state.speed ?? 0,
      maxSpeed: state.maxSpeed ?? 1,
      grounded: state.grounded ?? true,
      verticalVelocity: state.verticalVelocity ?? 0,
      justJumped: state.justJumped ?? false,
      landingImpact: state.landingImpact ?? 0,
      leanForward: state.leanForward ?? 0,
      leanSide: state.leanSide ?? 0,
    };

    if (this.position.distanceTo(this._targetPosition) > MAX_SNAP_DISTANCE) {
      this.position.copy(this._targetPosition);
    }
  }

  update(dt) {
    const alpha = 1 - Math.exp(-dt / POSITION_SMOOTH_TIME);
    this.position.lerp(this._targetPosition, alpha);

    let yawDiff = (this._targetYaw - this.visualYaw) % (Math.PI * 2);
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.visualYaw += yawDiff * alpha;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.visualYaw;
    this.mesh.visible = this.alive;

    this.stickman.update(dt, this._targetState);
  }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}
