// Serveur de developpement : sert simplement les fichiers statiques du client.
// La logique reseau (Socket.io, salons, autorite serveur) sera ajoutee en Phase 3.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));
// Three.js sert en dependance npm locale (pas de CDN externe) : plus fiable
// pour jouer en LAN/reseau restreint entre potes.
app.use('/vendor/three', express.static(path.join(__dirname, '..', 'node_modules', 'three', 'build')));

app.listen(PORT, () => {
  console.log(`Client servi sur http://localhost:${PORT}`);
});
