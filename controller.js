import { chords, chordTypes } from "./chords.js";
import { Touch } from "./touch.js";

export class Controller {
  constructor(canvas) {
    this.mode = "config";
    this.touch = new Touch(canvas, () => Tone.start());
    this.currentBoxId = null;
    this.actives = Object.values(chords).reduce((actives, chordArray) => {
      chordArray.forEach(({ label }) => (actives[label] = 1));
      return actives;
    }, {});
    this.boxes = {};
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

  toggleMode(toggle, mode) {
    this.mode = mode || this.mode === "config" ? "player" : "config";
    toggle.innerText = this.mode === "config" ? "Play" : "Config";
    this.currentBoxId = null;
  }

  handleBox(boxId) {
    let attack;
    let release;
    if (this.mode === "config") {
      this.actives[boxId] = this.actives[boxId] ? 0 : 1;
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
    if (box) {
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
    return { box, currentStepIdx: this.currentStepIdx, trigger };
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
