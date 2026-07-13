import { SocketClient } from './net/SocketClient.js';
import { startGame } from './main.js';

const socketClient = new SocketClient();

// Hook de developpement : facilite les tests bout-en-bout (pas utilise par le jeu lui-meme).
window.__paintballDebug = { socketClient };

// --- References DOM ------------------------------------------------------
const screenMenu = document.getElementById('screen-menu');
const screenLobby = document.getElementById('screen-lobby');
const hud = document.getElementById('hud');
const crosshair = document.getElementById('crosshair');
const overlay = document.getElementById('overlay');
const roundBanner = document.getElementById('round-banner');

const playerNameInput = document.getElementById('player-name');
const createRoomButton = document.getElementById('create-room-button');
const joinCodeInput = document.getElementById('join-code-input');
const joinRoomButton = document.getElementById('join-room-button');
const menuError = document.getElementById('menu-error');

const lobbyCodeEl = document.getElementById('lobby-code');
const lobbyPlayersEl = document.getElementById('lobby-players');
const readyButton = document.getElementById('ready-button');
const startButton = document.getElementById('start-button');
const leaveButton = document.getElementById('leave-button');
const lobbyError = document.getElementById('lobby-error');

let isReady = false;
let gameHandle = null;
let currentRoomState = null;

function showScreen(screen) {
  for (const el of [screenMenu, screenLobby]) el.classList.add('hidden');
  screen?.classList.remove('hidden');
}

function showError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}

function getPlayerName() {
  return playerNameInput.value.trim() || undefined;
}

function renderLobby(room) {
  lobbyCodeEl.textContent = room.code;
  lobbyPlayersEl.innerHTML = '';

  for (const p of room.players) {
    const li = document.createElement('li');
    const teamClass = p.team ? `team-dot--${p.team}` : 'team-dot--none';
    li.innerHTML = `
      <span class="player-name">
        <span class="team-dot ${teamClass}"></span>
        ${p.name}${p.isHost ? '<span class="host-badge">HOTE</span>' : ''}
      </span>
      <span class="ready-badge ${p.ready ? 'is-ready' : ''}">${p.ready ? 'Pret' : 'En attente'}</span>
    `;
    lobbyPlayersEl.appendChild(li);
  }

  const me = room.players.find((p) => p.id === socketClient.id);
  isReady = me?.ready ?? false;
  readyButton.textContent = isReady ? 'Pret !' : 'Pret';
  readyButton.classList.toggle('is-ready', isReady);

  const isHost = room.hostId === socketClient.id;
  startButton.classList.toggle('hidden', !isHost);
  startButton.disabled = room.players.length < 1 || !room.players.every((p) => p.ready);
}

// --- Menu : creer / rejoindre ------------------------------------------
createRoomButton.addEventListener('click', async () => {
  menuError.classList.add('hidden');
  try {
    const { room } = await socketClient.createRoom(getPlayerName());
    currentRoomState = room;
    showScreen(screenLobby);
    renderLobby(room);
  } catch (err) {
    showError(menuError, err.message);
  }
});

joinRoomButton.addEventListener('click', async () => {
  menuError.classList.add('hidden');
  const code = joinCodeInput.value.trim();
  try {
    const { room } = await socketClient.joinRoom(code, getPlayerName());
    currentRoomState = room;
    showScreen(screenLobby);
    renderLobby(room);
  } catch (err) {
    showError(menuError, err.message);
  }
});

joinCodeInput.addEventListener('input', () => {
  joinCodeInput.value = joinCodeInput.value.toUpperCase();
});

// --- Salon : pret / lancer / quitter -------------------------------------
readyButton.addEventListener('click', () => {
  isReady = !isReady;
  socketClient.setReady(isReady);
});

startButton.addEventListener('click', async () => {
  lobbyError.classList.add('hidden');
  try {
    await socketClient.startGame();
  } catch (err) {
    showError(lobbyError, err.message);
  }
});

leaveButton.addEventListener('click', () => {
  socketClient.leaveRoom();
  showScreen(screenMenu);
});

socketClient.on('room:update', (room) => {
  currentRoomState = room;
  // Toujours a jour, meme si le salon n'est pas affiche a l'instant (ex: partie
  // en cours) : evite un affichage perime au retour au salon apres une partie.
  renderLobby(room);
});

// --- Lancement de la partie -----------------------------------------------
socketClient.on('game:started', (state) => {
  if (gameHandle) return; // deja en jeu (redemarrage de manche, gere dans main.js)
  showScreen(null);
  gameHandle = startGame(socketClient, state);
});

// --- Retour au salon apres la fin d'une partie -----------------------------
socketClient.on('game:matchEnd', () => {
  setTimeout(() => {
    gameHandle?.stop();
    gameHandle = null;
    hud.classList.add('hidden');
    crosshair.classList.add('hidden');
    overlay.classList.add('hidden');
    roundBanner.classList.add('hidden');
    document.exitPointerLock?.();
    showScreen(screenLobby);
    if (currentRoomState) renderLobby(currentRoomState);
  }, 4500);
});
