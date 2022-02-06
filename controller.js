import { chords } from "./chords.js";
import { Touch } from "./touch.js";

export class Controller {
  constructor(canvas, onModeChange) {
    this.onModeChange = onModeChange;
    window.addEventListener("hashchange", (e) => {
      e.preventDefault();
      this.updateMode();
    });
    this.mode = location.hash === "#config" ? "config" : "play";
    const settings = this.saved();
    this._fixed = settings._fixed;
    this._invert = settings._invert;
    this._labels = settings._labels;
    this.actives = settings.actives;
    this.currentBoxId = null;
    this.touch = new Touch(canvas, () => Tone.start());
    this.boxes = {};
  }

  save() {
    localStorage.setItem(
      "omnichord",
      JSON.stringify({
        _fixed: this._fixed,
        _invert: this._invert,
        _labels: this._labels,
        actives: this.actives,
      })
    );
  }

  saved() {
    const defaults = {
      _fixed: false,
      _invert: false,
      _labels: true,
      actives: Object.values(chords).reduce((actives, chordArray) => {
        chordArray.forEach(({ label }) => (actives[label] = 1));
        return actives;
      }, {}),
    };
    try {
      const saved = localStorage.getItem("omnichord");
      const { _fixed, _invert, _labels, actives } = JSON.parse(saved);
      return { ...defaults, _fixed, _invert, _labels, actives };
    } catch (e) {
      return defaults;
    }
  }

  addBox(box) {
    this.boxes[box.id] = box;
    return box;
  }

  highlight(chord) {
    if (this.mode === "config") {
      return Boolean(this.actives[chord.label]);
    } else {
      return this.currentBoxId === chord.label;
    }
  }

  updateMode() {
    this.mode = location.hash === "#config" ? "config" : "play";
    this.currentBoxId = null;
    this.onModeChange();
  }

  process() {
    return this.touch.updatePointers(Object.values(this.boxes));
  }

  tick() {
    this.boxes = {};
    return { chords: this.chords, chordTypes: this.chordTypes };
  }

  toggleFixed() {
    this._fixed = !this._fixed;
    this.save();
  }
  toggleInvert() {
    this._invert = !this._invert;
    this.save();
  }

  toggleLabels() {
    this._labels = !this._labels;
    this.save();
  }

  handleBox(boxId) {
    let attack;
    let release;
    if (this.mode === "config") {
      this.actives[boxId] = this.actives[boxId] ? 0 : 1;
      this.save();
      return { attack, release };
    }
    if (this.currentBoxId === boxId) {
      this.currentBoxId = undefined;
      release = this.boxes[boxId].chord;
    } else {
      if (this.currentBoxId) {
        release = this.boxes[this.currentBoxId].chord;
      }
      this.currentBoxId = boxId;
      attack = this.boxes[boxId].chord;
    }
    return { attack, release };
  }

  handleStepper(pointer, state, isLandscape) {
    const box = this.boxes[this.currentBoxId];
    this.previousStepIdx = this.currentStepIdx;
    if (box && state !== "up") {
      const { X_RAT, Y_RAT } = this.touch.dimensions();
      const x = (pointer.x - X_RAT) / (1 - X_RAT * 2);
      const y = (pointer.y - Y_RAT) / (1 - Y_RAT * 2);
      const stepperCount = box.chord.stepper.length;
      this.currentStepIdx = Math.floor((isLandscape ? y : x) * stepperCount);
    } else {
      this.currentStepIdx = undefined;
    }
    const trigger =
      state !== "up" &&
      this.currentStepIdx !== this.previousStepIdx &&
      this.currentStepIdx !== undefined
        ? box.chord.stepper[this.currentStepIdx]
        : undefined;
    return { trigger };
  }

  get chords() {
    if (this.mode === "config") {
      return chords;
    }
    const copy = { ...chords };
    for (let type in copy) {
      if (this._fixed) {
        copy[type] = copy[type].map((a) => (this.actives[a.label] ? a : null));
      } else {
        copy[type] = copy[type].filter(({ label }) =>
          Boolean(this.actives[label])
        );
        if (!copy[type].length) {
          delete copy[type];
        }
      }
    }
    return copy;
  }
}
