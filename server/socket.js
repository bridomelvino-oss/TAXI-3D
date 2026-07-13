import { RoomManager } from './rooms.js';

const MOVE_RATE_LIMIT_MS = 20; // ~50 Hz max, garde-fou anti-flood cote serveur

/**
 * Branche tous les evenements Socket.io sur le RoomManager. C'est ici que
 * vit l'autorite serveur : le client propose (creation/rejoindre salon,
 * pret, tir), le serveur decide et diffuse l'etat qui fait foi a tout le
 * salon.
 */
export function setupSocket(io) {
  const rooms = new RoomManager();

  io.on('connection', (socket) => {
    const broadcastRoom = (room) => {
      if (!room) return;
      io.to(room.code).emit('room:update', room.toPublicState());
    };

    /** Diffuse la fin de manche/partie, et remet le salon en lobby si la partie est terminee. */
    const handleRoundResult = (room, result) => {
      if (!result) return;
      if (result.matchWinner) {
        io.to(room.code).emit('game:matchEnd', result);
        setTimeout(() => {
          if (rooms.rooms.get(room.code) !== room) return; // salon ferme entretemps
          room.resetToLobby();
          broadcastRoom(room);
        }, 4500);
      } else {
        io.to(room.code).emit('game:roundEnd', result);
        setTimeout(() => {
          if (rooms.rooms.get(room.code) !== room) return;
          room.startRound();
          io.to(room.code).emit('game:started', {
            ...room.toPublicState(),
            spawnPoints: { blue: room.spawnPointFor('blue'), red: room.spawnPointFor('red') },
          });
        }, 4000);
      }
    };

    socket.on('room:create', ({ name } = {}, ack) => {
      const room = rooms.createRoom(socket.id, name);
      socket.join(room.code);
      ack?.({ room: room.toPublicState() });
    });

    socket.on('room:join', ({ code, name } = {}, ack) => {
      if (!code) {
        ack?.({ error: 'Code de salon manquant.' });
        return;
      }
      const result = rooms.joinRoom(code, socket.id, name);
      if (result.error) {
        ack?.({ error: result.error });
        return;
      }
      socket.join(result.room.code);
      ack?.({ room: result.room.toPublicState() });
      broadcastRoom(result.room);
    });

    socket.on('room:ready', ({ ready } = {}) => {
      const room = rooms.getRoomBySocket(socket.id);
      const player = room?.players.get(socket.id);
      if (!player) return;
      player.ready = Boolean(ready);
      broadcastRoom(room);
    });

    socket.on('room:start', (_payload, ack) => {
      const room = rooms.getRoomBySocket(socket.id);
      if (!room) return ack?.({ error: 'Salon introuvable.' });
      if (room.hostId !== socket.id) return ack?.({ error: "Seul l'hote peut lancer la partie." });
      if (!room.allReady()) return ack?.({ error: 'Tous les joueurs doivent etre prets.' });

      room.assignTeams();
      room.startRound();
      const payload = {
        ...room.toPublicState(),
        spawnPoints: { blue: room.spawnPointFor('blue'), red: room.spawnPointFor('red') },
      };
      io.to(room.code).emit('game:started', payload);
    });

    // --- Etat de jeu (Phase 4) : relai a frequence limitee, aucune validation --
    // (la position n'a pas d'enjeu d'anti-triche ; seuls les impacts en ont)
    let lastMoveAt = 0;
    socket.on('game:state', (state) => {
      const now = Date.now();
      if (now - lastMoveAt < MOVE_RATE_LIMIT_MS) return;
      lastMoveAt = now;

      const room = rooms.getRoomBySocket(socket.id);
      if (!room || room.state !== 'playing') return;
      socket.to(room.code).emit('game:playerState', { id: socket.id, ...state });
    });

    // Decals de peinture sur le decor : simple relai visuel (pas d'enjeu de score)
    socket.on('game:decal', (decal) => {
      const room = rooms.getRoomBySocket(socket.id);
      if (!room || room.state !== 'playing') return;
      socket.to(room.code).emit('game:decal', decal);
    });

    // --- Impacts sur un joueur (Phase 5) : le serveur tranche -----------------
    socket.on('game:shot', ({ targetId } = {}) => {
      const room = rooms.getRoomBySocket(socket.id);
      if (!room || room.state !== 'playing') return;

      const shooter = room.players.get(socket.id);
      const target = room.players.get(targetId);
      if (!shooter || !target || !shooter.alive || !target.alive) return;
      if (shooter.team === target.team) return; // pas de tir ami

      const result = room.applyElimination(targetId);
      io.to(room.code).emit('game:playerEliminated', { targetId, shooterId: socket.id });
      handleRoundResult(room, result);
    });

    socket.on('room:leave', () => {
      const room = rooms.leaveRoom(socket.id);
      socket.leave(room?.code);
      broadcastRoom(room);
    });

    socket.on('disconnect', () => {
      const room = rooms.leaveRoom(socket.id);
      if (room && !room.isEmpty) {
        broadcastRoom(room);
        // Un joueur qui part en cours de manche peut faire gagner l'autre equipe
        if (room.state === 'playing') {
          handleRoundResult(room, room.checkRoundEnd());
        }
      }
      io.to(room?.code).emit('game:playerLeft', { id: socket.id });
    });
  });
}
