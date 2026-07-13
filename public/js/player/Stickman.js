import * as THREE from 'three';

// Dimensions du personnage (en metres)
const LEG_LENGTH = 0.75;
const ARM_LENGTH = 0.55;
const HIP_HEIGHT = LEG_LENGTH;

/**
 * Cree un personnage stickman low-poly (capsules/cylindres) dont les membres
 * sont des groupes pivotants, pour permettre une animation procedurale
 * (marche/course/saut) simple basee sur des sinusoides.
 */
export class Stickman {
  constructor(teamColor = 0x3366ff) {
    this.root = new THREE.Group();

    const limbMaterial = new THREE.MeshStandardMaterial({ color: teamColor });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xe0b088 });

    // --- Torse + tete, portes par un pivot "hanches" ---------------------
    this.hips = new THREE.Group();
    this.hips.position.y = HIP_HEIGHT;
    this.root.add(this.hips);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.5, 4, 8),
      limbMaterial
    );
    torso.position.y = 0.55;
    torso.castShadow = true;
    this.hips.add(torso);
    this.torso = torso;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), skinMaterial);
    head.position.y = 1.05;
    head.castShadow = true;
    this.hips.add(head);
    this.head = head;

    // --- Bras : pivot a l'epaule, cylindre decale vers le bas -----------
    this.leftArm = this._createLimb(0.08, ARM_LENGTH, limbMaterial);
    this.leftArm.pivot.position.set(0.34, 0.85, 0);
    this.hips.add(this.leftArm.pivot);

    this.rightArm = this._createLimb(0.08, ARM_LENGTH, limbMaterial);
    this.rightArm.pivot.position.set(-0.34, 0.85, 0);
    this.hips.add(this.rightArm.pivot);

    // --- Jambes : pivot a la hanche -----------------------------------
    this.leftLeg = this._createLimb(0.11, LEG_LENGTH, limbMaterial);
    this.leftLeg.pivot.position.set(0.16, 0, 0);
    this.hips.add(this.leftLeg.pivot);

    this.rightLeg = this._createLimb(0.11, LEG_LENGTH, limbMaterial);
    this.rightLeg.pivot.position.set(-0.16, 0, 0);
    this.hips.add(this.rightLeg.pivot);

    // Phase d'animation (avance avec la vitesse pour rester coherente au sol)
    this._gaitPhase = 0;
    this._idleTime = 0;
  }

  _createLimb(radius, length, material) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.8, length, 8), material);
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    return { pivot, mesh };
  }

  get mesh() {
    return this.root;
  }

  /**
   * Anime le personnage selon son etat de mouvement.
   * @param {number} dt - delta time en secondes
   * @param {{speed: number, maxSpeed: number, grounded: boolean, verticalVelocity: number}} state
   */
  update(dt, state) {
    const { speed, maxSpeed, grounded, verticalVelocity } = state;
    const speedRatio = THREE.MathUtils.clamp(speed / maxSpeed, 0, 1);

    if (!grounded) {
      // Pose "en l'air" : jambes repliees vers l'avant/arriere selon la vitesse verticale
      const airPose = verticalVelocity > 0 ? -0.5 : 0.3;
      this.leftLeg.pivot.rotation.x = THREE.MathUtils.lerp(this.leftLeg.pivot.rotation.x, airPose, 10 * dt);
      this.rightLeg.pivot.rotation.x = THREE.MathUtils.lerp(this.rightLeg.pivot.rotation.x, -airPose, 10 * dt);
      this.leftArm.pivot.rotation.x = THREE.MathUtils.lerp(this.leftArm.pivot.rotation.x, 0.6, 10 * dt);
      this.rightArm.pivot.rotation.x = THREE.MathUtils.lerp(this.rightArm.pivot.rotation.x, -0.6, 10 * dt);
      return;
    }

    if (speedRatio < 0.02) {
      // Idle : leger balancement, pas de foulee
      this._idleTime += dt;
      const bob = Math.sin(this._idleTime * 1.5) * 0.02;
      this.hips.position.y = HIP_HEIGHT + bob;
      this.leftLeg.pivot.rotation.x = THREE.MathUtils.lerp(this.leftLeg.pivot.rotation.x, 0, 8 * dt);
      this.rightLeg.pivot.rotation.x = THREE.MathUtils.lerp(this.rightLeg.pivot.rotation.x, 0, 8 * dt);
      this.leftArm.pivot.rotation.x = THREE.MathUtils.lerp(this.leftArm.pivot.rotation.x, 0, 8 * dt);
      this.rightArm.pivot.rotation.x = THREE.MathUtils.lerp(this.rightArm.pivot.rotation.x, 0, 8 * dt);
      return;
    }

    // Marche/course : la phase avance proportionnellement a la vitesse reelle,
    // pas juste au temps, pour que la frequence des pas suive la vitesse.
    const strideFrequency = 5.5;
    this._gaitPhase += dt * strideFrequency * (0.4 + speedRatio * 0.9);

    const swing = Math.sin(this._gaitPhase) * (0.5 + speedRatio * 0.35);
    this.leftLeg.pivot.rotation.x = swing;
    this.rightLeg.pivot.rotation.x = -swing;
    this.leftArm.pivot.rotation.x = -swing * 0.8;
    this.rightArm.pivot.rotation.x = swing * 0.8;

    // Petit rebond vertical du bassin, plus marque en course
    this.hips.position.y = HIP_HEIGHT + Math.abs(Math.sin(this._gaitPhase * 2)) * 0.03 * speedRatio;
  }
}
