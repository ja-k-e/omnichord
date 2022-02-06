export class TouchPointer {
  constructor({ x, y, down }) {
    this.down = down;
    this.x = x;
    this.y = y;
  }
  isInArea({ x, y, w, h }) {
    const inArea =
      this.x >= x && this.x < x + w && this.y >= y && this.y < y + h;
    return inArea && this.down ? "down" : null;
  }
}

export class Touch {
  constructor(element = document.body, onInitialized = () => {}) {
    this.element = element;
    this.initialized = false;
    this.onInitialized = onInitialized;
    element.addEventListener("pointermove", this.handleTouchMove.bind(this));
    element.addEventListener("pointerleave", this.handleTouchEnd.bind(this));
    element.addEventListener("pointerup", this.handleTouchEnd.bind(this));
    element.addEventListener("pointercancel", this.handleTouchEnd.bind(this));
    element.addEventListener("pointerout", this.handleTouchEnd.bind(this));
    element.addEventListener("pointerdown", (e) => {
      this.handleTouchStart(e);
      element.releasePointerCapture(e.pointerId);
    });
    this.pointers = {};
  }

  dimensions() {
    const gutter = Math.min(this.element.width, this.element.height) * 0.005;
    const X = gutter * 12;
    const Y = gutter * 12;
    const W = this.element.width - X * 2;
    const H = this.element.height - Y * 2;
    const X_RAT = X / this.element.width;
    const Y_RAT = Y / this.element.height;
    return { gutter, X, Y, W, H, X_RAT, Y_RAT };
  }

  relateArea({ x, y, w, h }) {
    const { X, Y, W, H } = this.dimensions();
    const wFactor = W / this.element.width;
    const hFactor = H / this.element.height;
    w *= wFactor;
    h *= hFactor;
    x = x * wFactor + X / this.element.width;
    y = y * hFactor + Y / this.element.height;
    return { x, y, w, h };
  }

  handleAnyEventOccurred() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.onInitialized();
  }

  handleTouchMove(event) {
    event.preventDefault();
    const {
      pointerId: id,
      offsetX,
      offsetY,
      target: { clientWidth, clientHeight },
    } = event;
    const x = offsetX / clientWidth;
    const y = offsetY / clientHeight;
    this.pointers[id] =
      this.pointers[id] || new TouchPointer({ x, y, down: false });
    this.pointers[id].x = x;
    this.pointers[id].y = y;
  }
  handleTouchStart(event) {
    this.handleAnyEventOccurred();
    event.preventDefault();
    const {
      pointerId: id,
      offsetX,
      offsetY,
      target: { clientWidth, clientHeight },
    } = event;
    const x = offsetX / clientWidth;
    const y = offsetY / clientHeight;
    this.pointers[id] =
      this.pointers[id] || new TouchPointer({ x, y, down: true });
  }
  handleTouchEnd(event) {
    this.handleAnyEventOccurred();
    event.preventDefault();
    const { pointerId: id } = event;
    if (this.pointers[id]) {
      this.pointers[id].x = Infinity;
      this.pointers[id].y = Infinity;
      this.pointers[id].down = false;
    }
  }

  updatePointers(areas) {
    const pointers = Object.values(this.pointers);
    const pointersA = pointers.map(({ area }) => area);
    pointers.forEach((pointer) => (pointer.area = undefined));
    areas.forEach((area) => {
      pointers.forEach((pointer) => {
        if (pointer.isInArea(this.relateArea(area))) {
          pointer.area = area.id;
        }
      });
    });
    const pointersZ = pointers.map(({ area }) => area);
    const pointerAreas = {};
    for (let i = 0; i < pointersA.length; i++) {
      const key = Object.keys(this.pointers)[i];
      const a = pointersA[i];
      const z = pointersZ[i];
      const pointer = pointers[i];
      if (a === z) {
        if (a) {
          pointerAreas[a] = { pointer, state: "hold" };
        } else {
          delete this.pointers[key];
        }
      } else if (a) {
        pointerAreas[a] = { pointer, state: "up" };
        if (z) {
          pointerAreas[z] = { pointer, state: "down" };
        }
      } else if (z) {
        pointerAreas[z] = { pointer, state: "down" };
      }
    }
    return pointerAreas;
  }
}
