import * as THREE from 'three';

// Dimensions du personnage (en metres)
const LEG_LENGTH = 0.75;
const ARM_LENGTH = 0.55;
const HIP_HEIGHT = LEG_LENGTH;
const BOOT_HEIGHT = 0.16;

// Squash & stretch (principe d'animation classique) pour vendre l'impact du
// saut/atterrissage sans avoir besoin d'un vrai skeleton.
const LAND_SQUASH_PER_SPEED = 0.05; // squash par m/s de vitesse de chute a l'impact
const MAX_SQUASH = 0.22;
const SQUASH_RECOVERY_SPEED = 10; // vitesse de retour a la normale
const JUMP_STRETCH = 0.12;

/**
 * Cree un personnage stickman low-poly, silhouette "joueur de paintball"
 * (masque, gilet, bouteille de CO2, bottes), dont les membres sont des
 * groupes pivotants pour permettre une animation procedurale (marche/course/
 * saut) basee sur des sinusoides, plus du squash/stretch et du lean (inclinaison).
 */
export class Stickman {
  constructor(teamColor = 0x3366ff) {
    this.root = new THREE.Group();

    const vestMaterial = new THREE.MeshStandardMaterial({ color: teamColor });
    const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x333844 });
    const maskMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x9fd6ff, metalness: 0.2, roughness: 0.3 });
    const gearMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2f36 });
    const bootMaterial = new THREE.MeshStandardMaterial({ color: 0x111318 });

    // --- Hanches : racine des jambes ET du haut du corps -----------------
    this.hips = new THREE.Group();
    this.hips.position.y = HIP_HEIGHT;
    this.root.add(this.hips);

    // Le haut du corps est un sous-groupe separe des jambes : le lean
    // (inclinaison avant/arriere et laterale) s'applique uniquement ici, les
    // jambes continuent leur foulee normalement sous le buste incline.
    this.upperBody = new THREE.Group();
    this.hips.add(this.upperBody);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.46, 4, 8), vestMaterial);
    torso.position.y = 0.55;
    torso.castShadow = true;
    this.upperBody.add(torso);
    this.torso = torso;

    // Epaulettes du gilet tactique : cachent le pivot des bras et elargissent
    // la silhouette (plus "joueur equipe" que simple capsule).
    for (const side of [1, -1]) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), gearMaterial);
      pad.position.set(0.32 * side, 0.83, 0);
      pad.castShadow = true;
      this.upperBody.add(pad);
    }

    // Bouteille de CO2 sur le dos, legerement inclinee
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), gearMaterial);
    tank.position.set(0, 0.6, -0.22);
    tank.rotation.x = 0.25;
    tank.castShadow = true;
    this.upperBody.add(tank);

    // --- Tete : masque complet + bande de lentille (look paintball) ------
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 12), maskMaterial);
    head.position.y = 1.05;
    head.castShadow = true;
    this.upperBody.add(head);
    this.head = head;

    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.12), lensMaterial);
    lens.position.set(0, 1.06, 0.16);
    this.upperBody.add(lens);

    // --- Bras : pivot a l'epaule, cylindre decale vers le bas -----------
    this.leftArm = this._createLimb(0.07, ARM_LENGTH, vestMaterial);
    this.leftArm.pivot.position.set(0.34, 0.85, 0);
    this.upperBody.add(this.leftArm.pivot);

    this.rightArm = this._createLimb(0.07, ARM_LENGTH, vestMaterial);
    this.rightArm.pivot.position.set(-0.34, 0.85, 0);
    this.upperBody.add(this.rightArm.pivot);

    // --- Jambes : pivot a la hanche (hors du groupe "upperBody", non affectees par le lean) --
    this.leftLeg = this._createLimb(0.1, LEG_LENGTH, pantsMaterial, bootMaterial);
    this.leftLeg.pivot.position.set(0.16, 0, 0);
    this.hips.add(this.leftLeg.pivot);

    this.rightLeg = this._createLimb(0.1, LEG_LENGTH, pantsMaterial, bootMaterial);
    this.rightLeg.pivot.position.set(-0.16, 0, 0);
    this.hips.add(this.rightLeg.pivot);

    // Phase d'animation (avance avec la vitesse pour rester coherente au sol)
    this._gaitPhase = 0;
    this._idleTime = 0;

    // Etat du squash/stretch (0 = taille normale, negatif = compresse, positif = etire)
    this._squash = 0;
    this._prevJustJumped = false;
  }

  _createLimb(radius, length, material, bootMaterial) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.85, length, 8), material);
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    pivot.add(mesh);

    if (bootMaterial) {
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.15, radius * 1.05, BOOT_HEIGHT, 8), bootMaterial);
      boot.position.y = -length + BOOT_HEIGHT / 2;
      boot.castShadow = true;
      pivot.add(boot);
    }

    return { pivot, mesh };
  }

  get mesh() {
    return this.root;
  }

  /**
   * Anime le personnage selon son etat de mouvement.
   * @param {number} dt - delta time en secondes
   * @param {{speed: number, maxSpeed: number, grounded: boolean, verticalVelocity: number,
   *   justJumped: boolean, landingImpact: number, leanForward: number, leanSide: number}} state
   */
  update(dt, state) {
    const { speed, maxSpeed, grounded, verticalVelocity, justJumped, landingImpact, leanForward, leanSide } = state;
    const speedRatio = THREE.MathUtils.clamp(speed / maxSpeed, 0, 1);

    if (!grounded) {
      // Pose "en l'air" : jambes repliees vers l'avant/arriere selon la vitesse verticale
      const airPose = verticalVelocity > 0 ? -0.55 : 0.35;
      this.leftLeg.pivot.rotation.x = THREE.MathUtils.lerp(this.leftLeg.pivot.rotation.x, airPose, 10 * dt);
      this.rightLeg.pivot.rotation.x = THREE.MathUtils.lerp(this.rightLeg.pivot.rotation.x, -airPose, 10 * dt);
      this.leftArm.pivot.rotation.x = THREE.MathUtils.lerp(this.leftArm.pivot.rotation.x, 0.7, 10 * dt);
      this.rightArm.pivot.rotation.x = THREE.MathUtils.lerp(this.rightArm.pivot.rotation.x, -0.7, 10 * dt);
    } else if (speedRatio < 0.02) {
      // Idle : leger balancement, pas de foulee
      this._idleTime += dt;
      const bob = Math.sin(this._idleTime * 1.5) * 0.02;
      this.hips.position.y = HIP_HEIGHT + bob;
      this.leftLeg.pivot.rotation.x = THREE.MathUtils.lerp(this.leftLeg.pivot.rotation.x, 0, 8 * dt);
      this.rightLeg.pivot.rotation.x = THREE.MathUtils.lerp(this.rightLeg.pivot.rotation.x, 0, 8 * dt);
      this.leftArm.pivot.rotation.x = THREE.MathUtils.lerp(this.leftArm.pivot.rotation.x, 0, 8 * dt);
      this.rightArm.pivot.rotation.x = THREE.MathUtils.lerp(this.rightArm.pivot.rotation.x, 0, 8 * dt);
    } else {
      // Marche/course : la phase avance proportionnellement a la vitesse reelle,
      // pas juste au temps, pour que la frequence des pas suive la vitesse.
      const strideFrequency = 6;
      this._gaitPhase += dt * strideFrequency * (0.45 + speedRatio * 1.0);

      const swing = Math.sin(this._gaitPhase) * (0.6 + speedRatio * 0.55);
      this.leftLeg.pivot.rotation.x = swing;
      this.rightLeg.pivot.rotation.x = -swing;
      this.leftArm.pivot.rotation.x = -swing * 0.9;
      this.rightArm.pivot.rotation.x = swing * 0.9;

      // Rebond vertical du bassin, plus marque en course : energie/dynamisme
      this.hips.position.y = HIP_HEIGHT + Math.abs(Math.sin(this._gaitPhase * 2)) * 0.05 * speedRatio;
    }

    // --- Lean (inclinaison) du buste : avant/arriere + laterale ------------
    this.upperBody.rotation.x = leanForward;
    this.upperBody.rotation.z = leanSide;

    // --- Squash & stretch : etirement au saut, compression a l'atterrissage --
    if (justJumped && !this._prevJustJumped) {
      this._squash = JUMP_STRETCH;
    }
    if (landingImpact > 0) {
      this._squash = -Math.min(landingImpact * LAND_SQUASH_PER_SPEED, MAX_SQUASH);
    }
    this._prevJustJumped = justJumped;

    this._squash += (0 - this._squash) * (1 - Math.exp(-SQUASH_RECOVERY_SPEED * dt));
    this.hips.scale.set(1 - this._squash * 0.5, 1 + this._squash, 1 - this._squash * 0.5);
  }
}
