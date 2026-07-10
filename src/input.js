const FORWARD_KEYS = new Set(["ArrowUp", "KeyZ", "KeyW"]);
const BACKWARD_KEYS = new Set(["ArrowDown", "KeyS"]);
const LEFT_KEYS = new Set(["ArrowLeft", "KeyQ", "KeyA"]);
const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);
const HANDBRAKE_KEYS = new Set(["Space"]);

export class InputState {
  constructor() {
    this.forward = false;
    this.backward = false;
    this.left = false;
    this.right = false;
    this.handbrake = false;

    this._down = new Set();

    window.addEventListener("keydown", (e) => this._onKey(e, true));
    window.addEventListener("keyup", (e) => this._onKey(e, false));
    window.addEventListener("blur", () => this.reset());
  }

  reset() {
    this.forward = this.backward = this.left = this.right = this.handbrake = false;
    this._down.clear();
  }

  _onKey(e, isDown) {
    if (HANDBRAKE_KEYS.has(e.code)) e.preventDefault();
    if (isDown) this._down.add(e.code);
    else this._down.delete(e.code);

    this.forward = this._any(FORWARD_KEYS);
    this.backward = this._any(BACKWARD_KEYS);
    this.left = this._any(LEFT_KEYS);
    this.right = this._any(RIGHT_KEYS);
    this.handbrake = this._any(HANDBRAKE_KEYS);
  }

  _any(keySet) {
    for (const k of this._down) if (keySet.has(k)) return true;
    return false;
  }
}
