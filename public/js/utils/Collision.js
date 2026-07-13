// Fonctions de collision simples, pensees pour une arene compacte low-poly.
// On ne fait pas de physique complete : juste ce qu'il faut pour un ressenti
// solide (pas de traversee des murs/caisses, pas de chute a travers le sol).

const _closest = { x: 0, z: 0 };

/**
 * Repousse `position` (Vector3) hors des boites `boxes` (Box3) en considerant
 * le joueur comme un cylindre vertical (rayon + hauteur).
 * Ne modifie que x/z : la hauteur (y) est geree separement par le raycast sol.
 */
export function resolveHorizontalCollisions(position, radius, height, boxes) {
  for (const box of boxes) {
    const feetY = position.y;
    const headY = position.y + height;

    // Pas de chevauchement vertical avec cet obstacle -> pas de collision
    if (headY < box.min.y || feetY > box.max.y) continue;

    const insideX = position.x >= box.min.x && position.x <= box.max.x;
    const insideZ = position.z >= box.min.z && position.z <= box.max.z;

    if (insideX && insideZ) {
      // Centre du joueur a l'interieur de la boite (cas rare, ex: spawn) :
      // on pousse vers la face la plus proche.
      const distToMinX = position.x - box.min.x;
      const distToMaxX = box.max.x - position.x;
      const distToMinZ = position.z - box.min.z;
      const distToMaxZ = box.max.z - position.z;
      const min = Math.min(distToMinX, distToMaxX, distToMinZ, distToMaxZ);

      if (min === distToMinX) position.x = box.min.x - radius;
      else if (min === distToMaxX) position.x = box.max.x + radius;
      else if (min === distToMinZ) position.z = box.min.z - radius;
      else position.z = box.max.z + radius;
      continue;
    }

    _closest.x = Math.max(box.min.x, Math.min(position.x, box.max.x));
    _closest.z = Math.max(box.min.z, Math.min(position.z, box.max.z));

    const dx = position.x - _closest.x;
    const dz = position.z - _closest.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq) || 0.0001;
      const overlap = radius - dist;
      position.x += (dx / dist) * overlap;
      position.z += (dz / dist) * overlap;
    }
  }
}

/**
 * Lance un rayon vers le bas depuis `position` (legerement surelevee) pour
 * trouver le sol/sommet d'obstacle le plus proche en dessous du joueur.
 * Retourne le point d'impact (THREE.Vector3) ou null si rien n'est trouve.
 */
export function raycastGround(raycaster, position, meshes, probeHeight, maxDistance) {
  raycaster.set(
    { x: position.x, y: position.y + probeHeight, z: position.z },
    { x: 0, y: -1, z: 0 }
  );
  raycaster.far = probeHeight + maxDistance;

  const hits = raycaster.intersectObjects(meshes, false);
  return hits.length > 0 ? hits[0] : null;
}
