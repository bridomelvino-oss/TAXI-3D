// Gestion des salons prives : creation avec code court, joueurs, equipes et
// deroule d'une partie (manches, score, elimination). C'est le seul endroit
// ou l'etat de la partie fait foi (autorite serveur) : le client ne fait que
// proposer (deplacement local, tir), le serveur decide de ce qui compte.
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I/O, faciles a confondre a l'oral
const CODE_LENGTH = 4;
const ROUNDS_TO_WIN = 3;
const TEAMS = ['blue', 'red'];

const SPAWN_POINTS = {
  blue: { x: -14, y: 0, z: -14 },
  red: { x: 14, y: 0, z: 14 },
};

function randomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  }
  return code;
}

class Room {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.players = new Map(); // id -> { id, name, team, ready, alive }
    this.state = 'lobby'; // 'lobby' | 'playing' | 'roundEnd' | 'matchEnd'
    this.scores = { blue: 0, red: 0 };
    this.round = 0;
  }

  addPlayer(id, name) {
    this.players.set(id, {
      id,
      name: name?.slice(0, 16) || `Joueur${this.players.size + 1}`,
      team: null,
      ready: false,
      alive: true,
    });
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostId === id) {
      const next = this.players.keys().next();
      this.hostId = next.done ? null : next.value;
    }
  }

  get isEmpty() {
    return this.players.size === 0;
  }

  allReady() {
    if (this.players.size === 0) return false;
    return [...this.players.values()].every((p) => p.ready);
  }

  /** Repartit les joueurs en 2 equipes equilibrees (alternance simple). */
  assignTeams() {
    const ids = [...this.players.keys()];
    ids.forEach((id, i) => {
      this.players.get(id).team = TEAMS[i % 2];
    });
  }

  spawnPointFor(team) {
    return SPAWN_POINTS[team] ?? SPAWN_POINTS.blue;
  }

  /** Remet tous les joueurs vivants et prets pour une nouvelle manche. */
  startRound() {
    this.state = 'playing';
    this.round += 1;
    for (const player of this.players.values()) {
      player.alive = true;
    }
  }

  /**
   * Applique une elimination validee par le serveur. Retourne un descriptif
   * de fin de manche/partie si applicable, sinon null.
   */
  applyElimination(targetId) {
    const target = this.players.get(targetId);
    if (!target || !target.alive) return null;
    target.alive = false;
    return this.checkRoundEnd();
  }

  checkRoundEnd() {
    const aliveByTeam = { blue: 0, red: 0 };
    for (const p of this.players.values()) {
      if (p.alive) aliveByTeam[p.team] = (aliveByTeam[p.team] || 0) + 1;
    }
    const blueAlive = aliveByTeam.blue > 0;
    const redAlive = aliveByTeam.red > 0;
    if (blueAlive && redAlive) return null; // manche toujours en cours

    // Equipe gagnante de la manche : celle qui a encore des joueurs vivants
    // (egalite improbable si les deux equipes ont au moins un joueur).
    const winningTeam = blueAlive ? 'blue' : redAlive ? 'red' : null;
    if (winningTeam) this.scores[winningTeam] += 1;

    const matchWinner = this.scores.blue >= ROUNDS_TO_WIN ? 'blue' : this.scores.red >= ROUNDS_TO_WIN ? 'red' : null;
    this.state = matchWinner ? 'matchEnd' : 'roundEnd';

    return { winningTeam, scores: { ...this.scores }, matchWinner };
  }

  /** Remet le salon en lobby apres une partie terminee, pret pour une revanche. */
  resetToLobby() {
    this.state = 'lobby';
    this.scores = { blue: 0, red: 0 };
    this.round = 0;
    for (const player of this.players.values()) {
      player.ready = false;
      player.alive = true;
      player.team = null;
    }
  }

  /** Etat public complet, envoye au client a chaque changement du salon. */
  toPublicState() {
    return {
      code: this.code,
      hostId: this.hostId,
      state: this.state,
      round: this.round,
      scores: { ...this.scores },
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        ready: p.ready,
        alive: p.alive,
        isHost: p.id === this.hostId,
      })),
    };
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> Room
    this.socketToCode = new Map(); // socketId -> code
  }

  createRoom(hostId, hostName) {
    let code;
    do {
      code = randomCode();
    } while (this.rooms.has(code));

    const room = new Room(code, hostId);
    room.addPlayer(hostId, hostName);
    this.rooms.set(code, room);
    this.socketToCode.set(hostId, code);
    return room;
  }

  joinRoom(code, socketId, name) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { error: 'Salon introuvable.' };
    if (room.state !== 'lobby') return { error: 'La partie a deja commence.' };
    if (room.players.size >= 8) return { error: 'Salon complet.' };

    room.addPlayer(socketId, name);
    this.socketToCode.set(socketId, code.toUpperCase());
    return { room };
  }

  getRoomBySocket(socketId) {
    const code = this.socketToCode.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  leaveRoom(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room) return undefined;
    room.removePlayer(socketId);
    this.socketToCode.delete(socketId);
    if (room.isEmpty) this.rooms.delete(room.code);
    return room;
  }
}
