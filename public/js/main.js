import * as THREE from 'three';
import { createWorld } from './world/World.js';
import { InputManager } from './input/InputManager.js';
import { PlayerController, MAX_SPEED } from './player/PlayerController.js';
import { RemotePlayer } from './player/RemotePlayer.js';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera.js';
import { Weapon } from './weapon/Weapon.js';
import { ImpactDecals } from './weapon/ImpactDecals.js';
import { Shooter } from './weapon/Shooter.js';

const TEAM_COLORS = { blue: 0x3366ff, red: 0xff3333 };
const TEAM_LABELS = { blue: 'Bleu', red: 'Rouge' };
const NETWORK_SEND_INTERVAL = 1 / 20; // 20 Hz : frequence d'envoi de l'etat local

/**
 * Demarre la partie (apres le salon) : monde 3D, joueur local, joueurs
 * distants, tir, equipes/manches/score. `socketClient` est deja connecte au
 * salon ; `initialState` est le payload recu de 'game:started' (equipes,
 * points de spawn, liste des joueurs).
 */
export function startGame(socketClient, initialState) {
  const localId = socketClient.id;

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

  // --- HUD -----------------------------------------------------------
  const hud = document.getElementById('hud');
  const crosshair = document.getElementById('crosshair');
  const overlay = document.getElementById('overlay');
  const overlaySubtitle = document.getElementById('overlay-subtitle');
  const playButton = document.getElementById('play-button');
  const scoreBlueEl = document.getElementById('score-blue');
  const scoreRedEl = document.getElementById('score-red');
  const roundNumberEl = document.getElementById('round-number');
  const roundBanner = document.getElementById('round-banner');
  const hitmarkerEl = document.getElementById('hitmarker');
  const fpsCounter = document.getElementById('fps-counter');

  hud.classList.remove('hidden');
  crosshair.classList.remove('hidden');
  overlay.classList.remove('hidden');

  function showHitmarker() {
    hitmarkerEl.classList.remove('show');
    void hitmarkerEl.offsetWidth; // relance l'animation CSS meme si deja en cours
    hitmarkerEl.classList.add('show');
  }

  function updateScoreboard(scores, round) {
    scoreBlueEl.textContent = scores.blue;
    scoreRedEl.textContent = scores.red;
    if (round != null) roundNumberEl.textContent = round;
  }

  let bannerTimeout = null;
  function showBanner(title, subtitle, duration = 3500) {
    roundBanner.innerHTML = subtitle ? `${title}<span class="banner-sub">${subtitle}</span>` : title;
    roundBanner.classList.remove('hidden');
    clearTimeout(bannerTimeout);
    if (duration > 0) bannerTimeout = setTimeout(() => roundBanner.classList.add('hidden'), duration);
  }

  playButton.addEventListener('click', () => input.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    overlay.classList.toggle('hidden', input.isPointerLocked);
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Joueur local --------------------------------------------------
  const localInfo = initialState.players.find((p) => p.id === localId);
  const localTeam = localInfo?.team ?? 'blue';
  const spawnFor = (team) => {
    const s = initialState.spawnPoints[team];
    return new THREE.Vector3(s.x, s.y, s.z);
  };

  const player = new PlayerController(world, spawnFor(localTeam), TEAM_COLORS[localTeam]);
  world.scene.add(player.mesh);

  const weapon = new Weapon(player.stickman.weaponMount, TEAM_COLORS[localTeam]);
  const decals = new ImpactDecals(world.scene);

  let localAlive = true;
  let spectatingId = null;

  // --- Joueurs distants ------------------------------------------------
  const remotePlayers = new Map();

  function addRemotePlayer(info) {
    if (info.id === localId || remotePlayers.has(info.id)) return;
    const remote = new RemotePlayer(info.id, info.team, TEAM_COLORS[info.team], spawnFor(info.team));
    remote.alive = info.alive !== false;
    remote.mesh.traverse((obj) => {
      if (obj.isMesh) obj.userData.playerId = info.id;
    });
    world.scene.add(remote.mesh);
    remotePlayers.set(info.id, remote);
  }

  function removeRemotePlayer(id) {
    const remote = remotePlayers.get(id);
    if (!remote) return;
    remote.dispose(world.scene);
    remotePlayers.delete(id);
  }

  initialState.players.forEach(addRemotePlayer);

  function getPlayerMeshes() {
    const meshes = [];
    for (const remote of remotePlayers.values()) {
      if (!remote.alive) continue;
      remote.mesh.traverse((obj) => {
        if (obj.isMesh) meshes.push(obj);
      });
    }
    return meshes;
  }

  // --- Tir -------------------------------------------------------------
  const shooter = new Shooter({
    camera,
    world,
    weapon,
    cameraController: thirdPersonCamera,
    getPlayerMeshes,
    onWorldHit: (point, normal) => {
      decals.spawn(point, normal, TEAM_COLORS[localTeam]);
      socketClient.sendDecal({
        point: { x: point.x, y: point.y, z: point.z },
        normal: { x: normal.x, y: normal.y, z: normal.z },
        color: TEAM_COLORS[localTeam],
      });
    },
    onPlayerHit: (targetId) => {
      socketClient.sendShot(targetId);
    },
  });

  // Camera orientee vers le centre de l'arene au depart, evite un flash au premier frame
  thirdPersonCamera.yaw = Math.atan2(-spawnFor(localTeam).x, -spawnFor(localTeam).z);

  // --- Reseau : reception --------------------------------------------
  const onPlayerState = (state) => {
    const remote = remotePlayers.get(state.id);
    if (remote) remote.applyNetworkState(state);
  };

  const onDecal = (decal) => {
    decals.spawn(
      new THREE.Vector3(decal.point.x, decal.point.y, decal.point.z),
      new THREE.Vector3(decal.normal.x, decal.normal.y, decal.normal.z),
      decal.color
    );
  };

  const onPlayerEliminated = ({ targetId }) => {
    if (targetId === localId) {
      localAlive = false;
      player.mesh.visible = false;
      // Spectateur : suit un coequipier vivant s'il y en a un
      spectatingId = null;
      for (const [id, remote] of remotePlayers) {
        if (remote.alive && remote.team === localTeam) {
          spectatingId = id;
          break;
        }
      }
    } else {
      const remote = remotePlayers.get(targetId);
      if (remote) remote.alive = false;
    }
  };

  const onPlayerLeft = ({ id }) => removeRemotePlayer(id);

  const onRoundEnd = ({ winningTeam, scores, round }) => {
    updateScoreboard(scores, round);
    showBanner(`Equipe ${TEAM_LABELS[winningTeam] ?? '?'} remporte la manche`, 'Prochaine manche dans quelques secondes...');
  };

  const onMatchEnd = ({ winningTeam, scores }) => {
    updateScoreboard(scores);
    showBanner(`Equipe ${TEAM_LABELS[winningTeam] ?? '?'} remporte la partie !`, 'Retour au salon...', 0);
  };

  const onGameStarted = (state) => {
    // (re)demarrage de manche : tout le monde revit a son point de spawn
    updateScoreboard(state.scores, state.round);
    roundBanner.classList.add('hidden');
    overlaySubtitle.textContent = `Manche ${state.round}`;

    for (const info of state.players) {
      if (info.id === localId) {
        localAlive = true;
        spectatingId = null;
        player.position.copy(spawnFor(info.team));
        player.velocity.set(0, 0, 0);
        player.mesh.visible = true;
      } else {
        addRemotePlayer(info); // au cas ou un joueur aurait rejoint entre-temps
        const remote = remotePlayers.get(info.id);
        if (remote) {
          remote.alive = true;
          remote.teleport(spawnFor(info.team));
        }
      }
    }
  };

  socketClient.on('game:playerState', onPlayerState);
  socketClient.on('game:decal', onDecal);
  socketClient.on('game:playerEliminated', onPlayerEliminated);
  socketClient.on('game:playerLeft', onPlayerLeft);
  socketClient.on('game:roundEnd', onRoundEnd);
  socketClient.on('game:matchEnd', onMatchEnd);
  socketClient.on('game:started', onGameStarted);

  updateScoreboard(initialState.scores, initialState.round);
  overlaySubtitle.textContent = `Manche ${initialState.round}`;

  // --- Boucle de rendu : delta-time, cible 60 fps, independante du framerate --
  const clock = new THREE.Clock();
  const MAX_DT = 1 / 20; // borne de securite si le navigateur bloque (evite les gros sauts physiques)
  let fpsAccumTime = 0;
  let fpsFrameCount = 0;
  let networkAccumTime = 0;
  let stopped = false;

  function animate() {
    if (stopped) return;
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), MAX_DT);

    if (input.isPointerLocked) {
      // Camera : reactive, appliquee immediatement (pas d'attente reseau/logique)
      thirdPersonCamera.applyMouseDelta(input.mouseDeltaX, input.mouseDeltaY, dt);

      if (localAlive) {
        // Joueur : prediction locale instantanee, jamais d'attente serveur
        player.update(dt, input.actions, thirdPersonCamera.yaw);

        if (input.firePressed) {
          const hit = shooter.tryFire();
          if (hit) showHitmarker();
        }
      }
    }
    input.resetMouseDelta();
    input.resetFirePressed();

    // Interpolation des joueurs distants (lisse les paquets reseau)
    for (const remote of remotePlayers.values()) remote.update(dt);
    shooter.update(dt);

    // Camera : suit le joueur local, ou un coequipier si spectateur
    let followPosition = player.position;
    if (!localAlive && spectatingId && remotePlayers.has(spectatingId)) {
      followPosition = remotePlayers.get(spectatingId).position;
    }
    thirdPersonCamera.update(followPosition, world.obstacleMeshes, dt);

    renderer.render(world.scene, camera);

    // Envoi de l'etat local au reseau, a frequence fixe (independante du framerate)
    if (localAlive) {
      networkAccumTime += dt;
      if (networkAccumTime >= NETWORK_SEND_INTERVAL) {
        networkAccumTime = 0;
        socketClient.sendState({
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          yaw: player.visualYaw,
          speed: Math.hypot(player.velocity.x, player.velocity.z),
          maxSpeed: MAX_SPEED,
          grounded: player.grounded,
          verticalVelocity: player.velocity.y,
          justJumped: player.justJumped,
          landingImpact: player.landingImpact,
          leanForward: player.leanForward,
          leanSide: player.leanSide,
        });
      }
    }

    fpsAccumTime += dt;
    fpsFrameCount += 1;
    if (fpsAccumTime >= 0.5) {
      fpsCounter.textContent = `${Math.round(fpsFrameCount / fpsAccumTime)} FPS`;
      fpsAccumTime = 0;
      fpsFrameCount = 0;
    }
  }

  animate();

  return {
    stop() {
      stopped = true;
      socketClient.off('game:playerState', onPlayerState);
      socketClient.off('game:decal', onDecal);
      socketClient.off('game:playerEliminated', onPlayerEliminated);
      socketClient.off('game:playerLeft', onPlayerLeft);
      socketClient.off('game:roundEnd', onRoundEnd);
      socketClient.off('game:matchEnd', onMatchEnd);
      socketClient.off('game:started', onGameStarted);
    },
  };
}
