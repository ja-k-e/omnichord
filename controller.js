import { chords } from "./chords.js";
import { Touch } from "./touch.js";

export class Controller {
  constructor(canvas) {
    const settings = this.saved();
    this.mode = settings.mode;
    this._showLabels = settings._showLabels;
    this.actives = settings.actives;
    this.currentBoxId = null;
    this.touch = new Touch(canvas, () => Tone.start());
    this.boxes = {};
  }

  save() {
    localStorage.setItem(
      "omnichord",
      JSON.stringify({
        _showLabels: this._showLabels,
        actives: this.actives,
        mode: this.mode,
      })
    );
  }

  saved() {
    const defaults = {
      _showLabels: true,
      mode: "config",
      actives: Object.values(chords).reduce((actives, chordArray) => {
        chordArray.forEach(({ label }) => (actives[label] = 1));
        return actives;
      }, {}),
    };
    try {
      const saved = localStorage.getItem("omnichord");
      const { _showLabels, actives, mode } = JSON.parse(saved);
      return { ...defaults, _showLabels, mode, actives };
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

  text(type) {
    if (type === "labels") {
      return this._showLabels ? "Hide Labels" : "Show Labels";
    } else if (type === "mode") {
      return this.mode === "config" ? "Play" : "Config";
    }
  }

  toggleLabels() {
    this._showLabels = !this._showLabels;
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

  get showLabels() {
    return this.mode === "config" || this._showLabels;
  }

  get chords() {
    if (this.mode === "config") {
      return chords;
    }
    const copy = { ...chords };
    for (let type in copy) {
      copy[type] = copy[type].filter(({ label }) =>
        Boolean(this.actives[label])
      );
      if (!copy[type].length) {
        delete copy[type];
      }
    }
    return copy;
  }
}
