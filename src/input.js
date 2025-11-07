export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keysDown = new Set();
    this.keyPressCallbacks = new Map();
    this.mouse = { x: 0, y: 0, down: false };
    this.actions = new Set();
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', e => {
      this.keysDown.add(e.key.toLowerCase());
      const callbacks = this.keyPressCallbacks.get(e.key.toLowerCase());
      if (callbacks) {
        callbacks.forEach(cb => cb(e));
      }
    });
    window.addEventListener('keyup', e => {
      this.keysDown.delete(e.key.toLowerCase());
    });
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
      this.mouse.y = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
    });
    this.canvas.addEventListener('mousedown', e => {
      if (e.button === 0) {
        this.mouse.down = true;
        this.actions.add('primary');
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) {
        this.mouse.down = false;
      }
    });
  }

  isKeyDown(key) {
    return this.keysDown.has(key.toLowerCase());
  }

  registerKeyPress(key, callback) {
    const lower = key.toLowerCase();
    if (!this.keyPressCallbacks.has(lower)) {
      this.keyPressCallbacks.set(lower, []);
    }
    this.keyPressCallbacks.get(lower).push(callback);
  }

  consumeAction(action) {
    if (this.actions.has(action)) {
      this.actions.delete(action);
      return true;
    }
    return false;
  }
}
