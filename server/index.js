// Serveur de developpement : sert simplement les fichiers statiques du client.
// La logique reseau (Socket.io, salons, autorite serveur) sera ajoutee en Phase 3.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
// Three.js est copie en asset statique dans public/vendor/three (pas de CDN
// externe) : le client fonctionne a l'identique en local et une fois deploye
// sur un hebergement statique (GitHub Pages, etc.).
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Client servi sur http://localhost:${PORT}`);
});
