export class TouchPointer {
  constructor({ x, y, down }) {
    this.down = down;
    this.x = x;
    this.y = y;
  }
  isInBox({ x, y, w, h }) {
    const inBox =
      this.x >= x && this.x < x + w && this.y >= y && this.y < y + h;
    return inBox && this.down ? "down" : null;
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
  handleAnyEventOccurred() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.onInitialized();
  }

  handleTouchMove(event) {
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

  updatePointers(boxes) {
    const pointers = Object.values(this.pointers);
    const pointersA = pointers.map(({ box }) => box);
    pointers.forEach((pointer) => (pointer.box = undefined));
    boxes.forEach((box) => {
      pointers.forEach((pointer) => {
        if (pointer.isInBox(box)) {
          pointer.box = box.id;
        }
      });
    });
    const pointersZ = pointers.map(({ box }) => box);
    const pointerBoxes = {};
    for (let i = 0; i < pointersA.length; i++) {
      const key = Object.keys(this.pointers)[i];
      const a = pointersA[i];
      const z = pointersZ[i];
      const pointer = pointers[i];
      if (a === z) {
        if (a) {
          pointerBoxes[a] = { pointer, state: "hold" };
        } else {
          delete this.pointers[key];
        }
      } else if (a) {
        pointerBoxes[a] = { pointer, state: "up" };
        if (z) {
          pointerBoxes[z] = { pointer, state: "down" };
        }
      } else if (z) {
        pointerBoxes[z] = { pointer, state: "down" };
      }
    }
    return pointerBoxes;
  }
}
