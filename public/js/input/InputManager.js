// Gestion centralisee des entrees clavier/souris.
//
// Astuce clavier : on utilise `event.code`, qui identifie la position PHYSIQUE
// de la touche et non le caractere produit. La touche physiquement a la place
// du "W" QWERTY correspond au "Z" sur un clavier AZERTY francais. On peut donc
// mapper ZQSD sans avoir a detecter la disposition du clavier de l'utilisateur.
const CODE_TO_ACTION = {
  KeyW: 'forward', // Z (AZERTY)
  KeyS: 'backward', // S
  KeyA: 'left', // Q (AZERTY)
  KeyD: 'right', // D
  Space: 'jump',
};

export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;

    // Etat courant des actions (true = touche enfoncee)
    this.actions = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
    };

    // Delta souris accumule depuis la derniere lecture (reinitialise a chaque frame)
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;

    // Clic gauche : "front" de declenchement (un tir par appui, pas par frame),
    // consomme puis remis a zero par le code appelant (meme pattern que le delta souris).
    this.firePressed = false;

    this.isPointerLocked = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  requestPointerLock() {
    this.domElement.requestPointerLock();
  }

  _onKeyDown(event) {
    const action = CODE_TO_ACTION[event.code];
    if (action) this.actions[action] = true;
  }

  _onKeyUp(event) {
    const action = CODE_TO_ACTION[event.code];
    if (action) this.actions[action] = false;
  }

  _onMouseMove(event) {
    if (!this.isPointerLocked) return;
    this.mouseDeltaX += event.movementX;
    this.mouseDeltaY += event.movementY;
  }

  _onMouseDown(event) {
    if (!this.isPointerLocked) return;
    if (event.button === 0) this.firePressed = true;
  }

  _onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  }

  // A appeler une fois par frame apres avoir consomme le delta souris.
  resetMouseDelta() {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  // A appeler une fois par frame apres avoir consomme la demande de tir.
  resetFirePressed() {
    this.firePressed = false;
  }
}
