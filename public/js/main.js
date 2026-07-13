import * as THREE from 'three';
import { createWorld } from './world/World.js';
import { InputManager } from './input/InputManager.js';
import { PlayerController } from './player/PlayerController.js';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera.js';

// --- Initialisation renderer / scene / camera --------------------------
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const world = createWorld();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);

const input = new InputManager(canvas);
const thirdPersonCamera = new ThirdPersonCamera(camera);
const player = new PlayerController(world, world.spawnPoints[0], 0x3366ff);
world.scene.add(player.mesh);

// Camera orientee vers le joueur des le depart pour eviter un flash au premier frame
thirdPersonCamera.yaw = Math.PI; // regarde vers le centre de l'arene depuis le spawn bleu

// --- Verrouillage du pointeur (clic pour jouer) -----------------------
const overlay = document.getElementById('overlay');
const playButton = document.getElementById('play-button');

playButton.addEventListener('click', () => {
  input.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  overlay.classList.toggle('hidden', input.isPointerLocked);
});

// --- Redimensionnement -------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Compteur FPS (validation visuelle de la fluidite) ------------------
const fpsCounter = document.getElementById('fps-counter');
let fpsAccumTime = 0;
let fpsFrameCount = 0;

// --- Boucle de rendu : delta-time, cible 60 fps, independante du framerate --
const clock = new THREE.Clock();
const MAX_DT = 1 / 20; // borne de securite si le navigateur bloque (evite les gros sauts physiques)

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), MAX_DT);

  if (input.isPointerLocked) {
    // Camera : reactive, appliquee immediatement (pas d'attente reseau/logique)
    thirdPersonCamera.applyMouseDelta(input.mouseDeltaX, input.mouseDeltaY, dt);

    // Joueur : prediction locale instantanee, base sur l'orientation camera
    player.update(dt, input.actions, thirdPersonCamera.yaw);
  }
  input.resetMouseDelta();

  thirdPersonCamera.update(player.position, world.obstacleMeshes, dt);

  renderer.render(world.scene, camera);

  // Mise a jour du compteur FPS deux fois par seconde
  fpsAccumTime += dt;
  fpsFrameCount += 1;
  if (fpsAccumTime >= 0.5) {
    const fps = Math.round(fpsFrameCount / fpsAccumTime);
    fpsCounter.textContent = `${fps} FPS`;
    fpsAccumTime = 0;
    fpsFrameCount = 0;
  }
}

animate();
