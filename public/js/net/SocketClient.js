// Fine couche au-dessus du client Socket.io (charge globalement via
// <script src="/socket.io/socket.io.js"> dans index.html - le serveur sert
// ce fichier lui-meme, pas besoin de le gerer nous-memes).
//
// Objectif : exposer une API a base de Promises pour les actions ponctuelles
// (creer/rejoindre un salon...) et un simple systeme d'abonnement pour les
// evenements diffuses par le serveur (mise a jour du salon, etats de jeu...).
export class SocketClient {
  constructor() {
    this.socket = window.io();
  }

  /** Envoie un evenement et attend l'accuse de reception du serveur. */
  _emitAck(event, payload) {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, payload, (response) => {
        if (response?.error) reject(new Error(response.error));
        else resolve(response);
      });
    });
  }

  createRoom(name) {
    return this._emitAck('room:create', { name });
  }

  joinRoom(code, name) {
    return this._emitAck('room:join', { code, name });
  }

  setReady(ready) {
    this.socket.emit('room:ready', { ready });
  }

  startGame() {
    return this._emitAck('room:start');
  }

  leaveRoom() {
    this.socket.emit('room:leave');
  }

  sendState(state) {
    this.socket.volatile.emit('game:state', state);
  }

  sendDecal(decal) {
    this.socket.emit('game:decal', decal);
  }

  sendShot(targetId) {
    this.socket.emit('game:shot', { targetId });
  }

  on(event, callback) {
    this.socket.on(event, callback);
  }

  off(event, callback) {
    this.socket.off(event, callback);
  }

  get id() {
    return this.socket.id;
  }
}
