import { chords } from "./chords.js";
import { Touch } from "./touch.js";

export class Controller {
  constructor(canvas) {
    const settings = this.saved();
    this.mode = settings.mode;
    this._fixed = settings._fixed;
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
        _labels: this._labels,
        actives: this.actives,
        mode: this.mode,
      })
    );
  }

  saved() {
    const defaults = {
      _fixed: false,
      _labels: true,
      actives: Object.values(chords).reduce((actives, chordArray) => {
        chordArray.forEach(({ label }) => (actives[label] = 1));
        return actives;
      }, {}),
      mode: "config",
    };
    try {
      const saved = localStorage.getItem("omnichord");
      const { _fixed, _labels, actives, mode } = JSON.parse(saved);
      return { ...defaults, _fixed, _labels, actives, mode };
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

  toggleLabels() {
    this._labels = !this._labels;
    this.save();
  }

  toggleMode() {
    this.mode = this.mode === "config" ? "player" : "config";
    this.currentBoxId = null;
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

  handleStepper({ x, y }, state, isLandscape) {
    const box = this.boxes[this.currentBoxId];
    this.previousStepIdx = this.currentStepIdx;
    if (box && state !== "up") {
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

  showLabels() {
    return this.mode === "config" || this._labels;
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
