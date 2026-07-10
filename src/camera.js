import * as THREE from "three";

const OFFSET_DISTANCE = 9; // behind the vehicle
const OFFSET_HEIGHT = 4.5;
const LOOK_HEIGHT = 1.2;
const POSITION_DAMPING = 4.5; // higher = snappier
const LOOK_DAMPING = 6;

export class ThirdPersonCamera {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 500);
    this._currentPos = new THREE.Vector3(0, OFFSET_HEIGHT, -OFFSET_DISTANCE);
    this._currentLook = new THREE.Vector3();
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  snapTo(target) {
    const behind = new THREE.Vector3(
      target.position.x - Math.sin(target.heading) * OFFSET_DISTANCE,
      OFFSET_HEIGHT,
      target.position.z - Math.cos(target.heading) * OFFSET_DISTANCE
    );
    this._currentPos.copy(behind);
    this._currentLook.set(target.position.x, LOOK_HEIGHT, target.position.z);
    this.camera.position.copy(this._currentPos);
    this.camera.lookAt(this._currentLook);
  }

  update(dt, target) {
    const desiredPos = new THREE.Vector3(
      target.position.x - Math.sin(target.heading) * OFFSET_DISTANCE,
      OFFSET_HEIGHT,
      target.position.z - Math.cos(target.heading) * OFFSET_DISTANCE
    );
    const desiredLook = new THREE.Vector3(target.position.x, LOOK_HEIGHT, target.position.z);

    const posT = 1 - Math.exp(-POSITION_DAMPING * dt);
    const lookT = 1 - Math.exp(-LOOK_DAMPING * dt);

    this._currentPos.lerp(desiredPos, posT);
    this._currentLook.lerp(desiredLook, lookT);

    this.camera.position.copy(this._currentPos);
    this.camera.lookAt(this._currentLook);
  }
}
