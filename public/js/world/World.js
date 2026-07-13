import * as THREE from 'three';

const ARENA_SIZE = 40; // cote de l'arene carree
const WALL_HEIGHT = 4;
const WALL_THICKNESS = 1;

/**
 * Construit l'arene de test : sol, murs de bordure, obstacles varies
 * (caisses, murets, palettes, pneus, bunkers gonflables, plateformes avec
 * rampes) et vegetation decorative, deux zones de spawn opposees.
 * Renvoie la scene ainsi que les listes de collision utilisees par le
 * controleur joueur et la camera.
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

  /**
   * Ajoute un mesh au monde et l'enregistre pour les collisions.
   * `blockMovement: false` sert pour les rampes : on veut pouvoir marcher
   * dessus (raycast sol + non-traverse par la camera) sans mur invisible qui
   * empecherait de monter la pente.
   */
  const addObstacle = (mesh, { blockMovement = true } = {}) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    mesh.updateMatrixWorld(true);
    groundMeshes.push(mesh);
    obstacleMeshes.push(mesh);
    if (blockMovement) {
      obstacleBoxes.push(new THREE.Box3().setFromObject(mesh));
    }
  };

  /** Ajoute un element purement decoratif (vegetation, taches de peinture) : aucune collision. */
  const addDecoration = (mesh) => {
    mesh.castShadow = true;
    scene.add(mesh);
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
  ];
  for (const [x, y, z] of cratePositions) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), crateMaterial);
    crate.position.set(x, y, z);
    addObstacle(crate);
  }

  // --- Murets de couverture --------------------------------------------
  const wallLowMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
  const muretConfigs = [
    { pos: [-10, 0.6, 6], size: [4, 1.2, 0.6] },
    { pos: [10, 0.6, -6], size: [4, 1.2, 0.6] },
  ];
  for (const cfg of muretConfigs) {
    const muret = new THREE.Mesh(new THREE.BoxGeometry(...cfg.size), wallLowMaterial);
    muret.position.set(...cfg.pos);
    addObstacle(muret);
  }

  // --- Palettes empilees (cover bas, typique paintball) -------------------
  const palletMaterial = new THREE.MeshStandardMaterial({ color: 0xa9865a });
  const palletStackPositions = [[-3, 0], [3, 12], [-9, -10]];
  for (const [x, z] of palletStackPositions) {
    for (let i = 0; i < 4; i++) {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 1.3), palletMaterial);
      pallet.position.set(x, 0.14 * i + 0.07, z);
      pallet.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
      addObstacle(pallet);
    }
  }

  // --- Pneus empiles (cover rond) -----------------------------------
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1c1c });
  const tireStackPositions = [[-13, 3], [13, -3], [2, -12]];
  for (const [x, z] of tireStackPositions) {
    for (let i = 0; i < 3; i++) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.16, 10, 16), tireMaterial);
      tire.rotation.x = Math.PI / 2; // pneu couche, trou vers le haut
      tire.position.set(x, 0.16 + i * 0.32, z);
      addObstacle(tire);
    }
  }

  // --- Bunkers gonflables (formes emblematiques du paintball) -------------
  const bunkerOrangeMaterial = new THREE.MeshStandardMaterial({ color: 0xff6a2b });
  const bunkerBlueMaterial = new THREE.MeshStandardMaterial({ color: 0x2b7bff });

  // "Dorito" : bunker pyramidal (cone a base carree)
  const dorito = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.3, 4), bunkerOrangeMaterial);
  dorito.position.set(-4, 0.65, -6);
  dorito.rotation.y = Math.PI / 4;
  addObstacle(dorito);

  const dorito2 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.3, 4), bunkerOrangeMaterial);
  dorito2.position.set(4, 0.65, 6);
  dorito2.rotation.y = Math.PI / 4;
  addObstacle(dorito2);

  // "Can" : bunker cylindrique
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.4, 12), bunkerBlueMaterial);
  can.position.set(-11, 0.7, -11);
  addObstacle(can);

  const can2 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.4, 12), bunkerBlueMaterial);
  can2.position.set(11, 0.7, 11);
  addObstacle(can2);

  // --- Plateformes surelevees + rampes (verticalite du terrain) -----------
  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x77726a });
  const rampMaterial = new THREE.MeshStandardMaterial({ color: 0x8a8478 });

  /** Cree une plateforme rectangulaire surelevee avec une rampe d'acces. */
  function addPlatformWithRamp({ center, platformSize, platformHeight, rampRun, rampSide }) {
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(platformSize[0], platformHeight, platformSize[1]),
      platformMaterial
    );
    platform.position.set(center[0], platformHeight / 2, center[1]);
    addObstacle(platform);

    // La rampe relie le sol (y=0) au sommet de la plateforme (y=platformHeight),
    // sur une distance horizontale `rampRun`, du cote `rampSide` de la plateforme.
    const rise = platformHeight;
    const run = rampRun;
    const hypotenuse = Math.sqrt(run * run + rise * rise);
    const angle = Math.atan2(rise, run);

    const ramp = new THREE.Mesh(new THREE.BoxGeometry(platformSize[0] * 0.7, 0.3, hypotenuse), rampMaterial);
    ramp.rotation.x = -angle;

    // Position : part du bord de la plateforme (rampSide) et descend vers l'exterieur
    const dir = rampSide; // { x, z } vecteur unitaire pointant hors de la plateforme
    const edgeOffset = platformSize[1] / 2; // (approx, fonctionne pour les cotes +-Z utilises ici)
    ramp.position.set(
      center[0] + dir.x * (edgeOffset + (run / 2) * Math.cos(0)),
      rise / 2,
      center[1] + dir.z * (edgeOffset + run / 2)
    );
    addObstacle(ramp, { blockMovement: false });
  }

  addPlatformWithRamp({
    center: [-6, -14],
    platformSize: [4, 4],
    platformHeight: 1.4,
    rampRun: 3.2,
    rampSide: { x: 0, z: -1 },
  });

  addPlatformWithRamp({
    center: [6, 14],
    platformSize: [4, 4],
    platformHeight: 1.4,
    rampRun: 3.2,
    rampSide: { x: 0, z: 1 },
  });

  // --- Vegetation decorative (bordure de l'arene) -------------------------
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4a30 });
  const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x3f7a3f });

  function addTree(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6), trunkMaterial);
    trunk.position.set(x, 0.6, z);
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 8), foliageMaterial);
    foliage.position.set(x, 1.9, z);
    addDecoration(trunk);
    addDecoration(foliage);
  }

  function addBush(x, z) {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), foliageMaterial);
    bush.position.set(x, 0.4, z);
    addDecoration(bush);
  }

  const treePositions = [
    [-18, -18], [18, -18], [-18, 18], [18, 18],
    [-18, 0], [18, 0],
  ];
  for (const [x, z] of treePositions) addTree(x, z);

  const bushPositions = [[-15, 15], [15, -15], [0, 17], [0, -17]];
  for (const [x, z] of bushPositions) addBush(x, z);

  // --- Taches de peinture decoratives au sol (aucune collision) -----------
  const splatterColors = [0xff3355, 0x3366ff, 0xffdd33, 0x33cc66];
  const splatterPositions = [
    [-5, 3], [5, -3], [-2, -8], [8, 8], [-8, -4], [1, 6],
  ];
  splatterPositions.forEach(([x, z], i) => {
    const splatter = new THREE.Mesh(
      new THREE.CircleGeometry(0.5 + (i % 3) * 0.15, 10),
      new THREE.MeshBasicMaterial({ color: splatterColors[i % splatterColors.length] })
    );
    splatter.rotation.x = -Math.PI / 2;
    splatter.position.set(x, 0.015, z);
    scene.add(splatter);
  });

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
