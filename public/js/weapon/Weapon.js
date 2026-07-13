import * as THREE from 'three';

const RECOIL_KICK = 0.5; // rad, kick instantane du canon au tir
const RECOIL_RECOVERY_SPEED = 16; // vitesse de retour a la position de repos
const FLASH_DURATION = 0.06; // secondes d'affichage du flash

/**
 * Marqueur de paintball tenu en main : mesh visuel + recul du canon +
 * flash au museau. Purement cosmetique, ne participe pas au calcul du tir
 * (le raycast se fait depuis la camera, voir Shooter.js).
 */
export class Weapon {
  constructor(mount, accentColor = 0x3366ff) {
    this.group = new THREE.Group();
    mount.add(this.group);

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x24262b });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: accentColor });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.26), bodyMaterial);
    body.position.set(0, 0, 0.1);
    body.castShadow = true;
    this.group.add(body);

    // Le canon est son propre groupe pour pouvoir "kicker" en rotation au tir
    this.barrelPivot = new THREE.Group();
    this.barrelPivot.position.set(0, 0.02, 0.22);
    this.group.add(this.barrelPivot);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 8), bodyMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.16;
    barrel.castShadow = true;
    this.barrelPivot.add(barrel);

    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), accentMaterial);
    hopper.position.set(0, 0.09, 0.02);
    this.group.add(hopper);

    // Flash au museau : un plan additif, invisible au repos
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe38a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), flashMaterial);
    this.flash.position.set(0, 0.02, 0.34);
    this.barrelPivot.add(this.flash);

    this._flashTimer = 0;
  }

  /** Declenche le feedback visuel d'un tir (a appeler au moment ou le coup part). */
  fire() {
    this.barrelPivot.rotation.x = -RECOIL_KICK;
    this._flashTimer = FLASH_DURATION;
    this.flash.material.opacity = 1;
    // Orientation aleatoire du flash pour eviter un motif toujours identique
    this.flash.rotation.z = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.barrelPivot.rotation.x += (0 - this.barrelPivot.rotation.x) * (1 - Math.exp(-RECOIL_RECOVERY_SPEED * dt));

    if (this._flashTimer > 0) {
      this._flashTimer -= dt;
      this.flash.material.opacity = Math.max(this._flashTimer / FLASH_DURATION, 0);
      if (this._flashTimer <= 0) this.flash.material.opacity = 0;
    }
  }
}
