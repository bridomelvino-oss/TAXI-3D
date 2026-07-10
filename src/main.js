import * as THREE from "three";
import { COLORS } from "./config.js";
import { buildCity } from "./city.js";
import { Taxi } from "./taxi.js";
import { InputState } from "./input.js";
import { ThirdPersonCamera } from "./camera.js";
import { GameManager } from "./game.js";
import { Hud } from "./hud.js";

const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.sky);
scene.fog = new THREE.Fog(COLORS.sky, 90, 240);

// ---- lighting ----
const hemi = new THREE.HemisphereLight(COLORS.sky, COLORS.laterite, 0.95);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff3d6, 1.15);
sun.position.set(60, 80, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -110;
sun.shadow.camera.right = 110;
sun.shadow.camera.top = 110;
sun.shadow.camera.bottom = -110;
sun.shadow.camera.far = 260;
sun.shadow.bias = -0.0015;
sun.shadow.radius = 2;
scene.add(sun);
scene.add(sun.target);

// ---- world ----
const city = buildCity(scene);

const taxi = new Taxi(scene);
taxi.setSpawn(city.plazaCenter.x + 9, city.plazaCenter.z, Math.PI);

const thirdPersonCamera = new ThirdPersonCamera(window.innerWidth / window.innerHeight);
thirdPersonCamera.snapTo(taxi);

const input = new InputState();
const hud = new Hud();

const game = new GameManager(scene, city.spawnZones, city.plazaCenter, (evt) => {
  if (evt.type === "newObjective") {
    hud.setObjective(evt.phase);
  } else if (evt.type === "fareEarned") {
    hud.setMoney(evt.money);
    hud.showFare(evt.fare, evt.bonusRatio);
  } else if (evt.type === "timerTick") {
    hud.setTimer(evt.remaining, evt.limit);
  } else if (evt.type === "tripExpired") {
    hud.setTimer(0, 1);
  }
});
hud.setMoney(0);
hud.setObjective(game.phase);

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  thirdPersonCamera.setAspect(w / h);
}
window.addEventListener("resize", onResize);
onResize();

// ---- start screen ----
const startScreen = document.getElementById("start-screen");
const playButton = document.getElementById("play-button");
let started = false;
playButton.addEventListener("click", () => {
  started = true;
  startScreen.classList.add("hidden");
});

// ---- main loop ----
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (started) {
    taxi.update(dt, input, city.colliders, city.bounds);
    game.update(dt, taxi.position);

    const objective = game.getObjective();
    hud.setDirectionArrow(taxi.position, taxi.heading, objective.point);
    hud.drawMinimap(taxi.position, taxi.heading, objective.point, objective.phase);
  }

  thirdPersonCamera.update(dt, taxi);
  sun.position.set(taxi.position.x + 60, 80, taxi.position.z + 40);
  sun.target.position.set(taxi.position.x, 0, taxi.position.z);

  renderer.render(scene, thirdPersonCamera.camera);
}

animate();

