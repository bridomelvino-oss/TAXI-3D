// Serveur : sert les fichiers statiques du client et heberge Socket.io pour
// la synchro temps reel (salons, mouvement, autorite serveur sur les impacts).
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { setupSocket } from './socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
// Three.js est copie en asset statique dans public/vendor/three (pas de CDN
// externe) : le client fonctionne a l'identique en local et une fois deploye
// sur un hebergement statique (GitHub Pages, etc.).
app.use(express.static(path.join(__dirname, '..', 'public')));

const httpServer = createServer(app);
const io = new Server(httpServer);
setupSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Serveur (client + Socket.io) sur http://localhost:${PORT}`);
});
