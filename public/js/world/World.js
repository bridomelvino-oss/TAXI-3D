import * as THREE from 'three';

const ARENA_SIZE = 40; // cote de l'arene carree
const WALL_HEIGHT = 4;
const WALL_THICKNESS = 1;

/**
 * Construit l'arene de test : sol, murs de bordure, caisses et murets de
 * couverture, deux zones de spawn opposees. Renvoie la scene ainsi que les
 * listes de collision utilisees par le controleur joueur et la camera.
 */
export function createWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b6d9);
  scene.fog = new THREE.Fog(0x87b6d9, 25, 55);

  // --- Eclairage -----------------------------------------------------
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x445566, 0.9);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff2e0, 1.1);
  sunLight.position.set(15, 25, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -30;
  sunLight.shadow.camera.right = 30;
  sunLight.shadow.camera.top = 30;
  sunLight.shadow.camera.bottom = -30;
  sunLight.shadow.camera.far = 60;
  scene.add(sunLight);

  // --- Sol -------------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x5c8a4a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Listes de collision : les obstacles servent a la fois au raycast sol
  // (on peut monter dessus) et a la poussee horizontale (on ne les traverse pas).
  const groundMeshes = [ground];
  const obstacleMeshes = [];
  const obstacleBoxes = [];

  const addObstacle = (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    mesh.updateMatrixWorld(true);
    groundMeshes.push(mesh);
    obstacleMeshes.push(mesh);
    obstacleBoxes.push(new THREE.Box3().setFromObject(mesh));
  };

  // --- Murs de bordure ---------------------------------------------------
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8a7a6a });
  const half = ARENA_SIZE / 2;
  const wallConfigs = [
    { pos: [0, WALL_HEIGHT / 2, -half], size: [ARENA_SIZE, WALL_HEIGHT, WALL_THICKNESS] },
    { pos: [0, WALL_HEIGHT / 2, half], size: [ARENA_SIZE, WALL_HEIGHT, WALL_THICKNESS] },
    { pos: [-half, WALL_HEIGHT / 2, 0], size: [WALL_THICKNESS, WALL_HEIGHT, ARENA_SIZE] },
    { pos: [half, WALL_HEIGHT / 2, 0], size: [WALL_THICKNESS, WALL_HEIGHT, ARENA_SIZE] },
  ];
  for (const cfg of wallConfigs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...cfg.size), wallMaterial);
    wall.position.set(...cfg.pos);
    addObstacle(wall);
  }

  // --- Caisses de couverture ----------------------------------------
  const crateMaterial = new THREE.MeshStandardMaterial({ color: 0xb08650 });
  const cratePositions = [
    [-6, 0.75, 4], [-6, 0.75, 2], [-4, 0.75, 4],
    [6, 0.75, -4], [6, 0.75, -2], [4, 0.75, -4],
    [0, 0.75, 8], [0, 0.75, -8],
  ];
  for (const [x, y, z] of cratePositions) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), crateMaterial);
    crate.position.set(x, y, z);
    addObstacle(crate);
  }

  // --- Murets de couverture --------------------------------------------
  const wallLowMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
  const muretConfigs = [
    { pos: [-10, 0.6, 0], size: [4, 1.2, 0.6] },
    { pos: [10, 0.6, 0], size: [4, 1.2, 0.6] },
    { pos: [0, 0.6, 0], size: [0.6, 1.2, 5] },
  ];
  for (const cfg of muretConfigs) {
    const muret = new THREE.Mesh(new THREE.BoxGeometry(...cfg.size), wallLowMaterial);
    muret.position.set(...cfg.pos);
    addObstacle(muret);
  }

  // --- Zones de spawn (visuelles uniquement pour l'instant) --------------
  const spawnPoints = [
    new THREE.Vector3(-14, 0, -14),
    new THREE.Vector3(14, 0, 14),
  ];
  const spawnColors = [0x3366ff, 0xff3333];
  spawnPoints.forEach((point, i) => {
    const marker = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 24),
      new THREE.MeshBasicMaterial({ color: spawnColors[i], transparent: true, opacity: 0.35 })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(point.x, 0.02, point.z);
    scene.add(marker);
  });

  return {
    scene,
    groundMeshes, // pour le raycast vertical (sol + dessus des obstacles)
    obstacleMeshes, // pour le raycast camera (evite de traverser un obstacle)
    obstacleBoxes, // pour la poussee horizontale du joueur
    spawnPoints,
  };
}
