import { chords } from "./chords.js";
import { Touch } from "./touch.js";
import { Sounds } from "./sounds.js";

export class Controller {
  constructor(canvas, onModeChange) {
    this.sounds = new Sounds();
    this.onModeChange = onModeChange;
    window.addEventListener("hashchange", (e) => {
      e.preventDefault();
      this.updateMode();
      this.sounds.stopAll();
    });
    this.mode = location.hash === "#config" ? "config" : "perform";
    const settings = this.saved();
    // this._chord = settings._chord; // TODO: playing the chord or not
    this._fixed = settings._fixed;
    this._fx = settings._fx === undefined ? true : settings._fx;
    this._invert = settings._invert;
    this._labels = settings._labels;
    this._rate = settings._rate;
    this._rhythm = settings._rhythm;
    this._tempo = settings._tempo;
    this.actives = settings.actives;
    this.areas = {};
    this.currentAreaId = null;
    this.handleFx();
    this.touch = new Touch(canvas, () =>
      this.sounds.initialize(this._rhythm, this._rate || 1)
    );
  }

  addArea(area) {
    this.areas[area.id] = area;
    return area;
  }

  handleFx() {
    if (this._fx) {
      this.sounds.fxOn();
    } else {
      this.sounds.fxOff();
    }
  }

  save() {
    localStorage.setItem(
      "omnichord",
      JSON.stringify({
        _fixed: this._fixed,
        _fx: this._fx,
        _invert: this._invert,
        _labels: this._labels,
        _rate: this._rate,
        _rhythm: this._rhythm,
        _tempo: this._tempo,
        actives: this.actives,
      })
    );
  }

  saved() {
    const defaults = {
      _fixed: false,
      _fx: true,
      _invert: false,
      _labels: true,
      _rate: 1,
      _rhythm: "foxtrot",
      _tempo: true,
      actives: Object.values(chords).reduce((actives, chordArray) => {
        chordArray.forEach(({ label }) => (actives[label] = 1));
        return actives;
      }, {}),
    };
    try {
      const saved = localStorage.getItem("omnichord");
      const { _fixed, _fx, _invert, _labels, _rate, _rhythm, _tempo, actives } =
        JSON.parse(saved);
      return {
        ...defaults,
        _fixed,
        _fx,
        _invert,
        _labels,
        _rate,
        _rhythm,
        _tempo,
        actives,
      };
    } catch (e) {
      return defaults;
    }
  }

  highlight(chord) {
    if (this.mode === "config") {
      return Boolean(this.actives[chord.label]);
    } else {
      return this.currentAreaId === chord.label;
    }
  }

  updateMode() {
    this.mode = location.hash === "#config" ? "config" : "perform";
    this.currentAreaId = null;
    this.onModeChange();
  }

  process(harpShape) {
    const states = this.touch.updatePointers(Object.values(this.areas));
    for (let areaId in states) {
      const { pointer, state } = states[areaId];
      if (state) {
        if (this.touch.initialized) {
          if (
            areaId === "tempo-plus" ||
            areaId === "tempo-minus" ||
            areaId === "rhythm"
          ) {
            this.handleRhythm(state, areaId);
          } else if (areaId === "stepper") {
            this.handleStepper(pointer, state, harpShape);
          } else if (state === "down") {
            this.handlePad(areaId);
          }
        }
      }
    }
  }

  tick() {
    this.areas = {};
    return { chords: this.chords, chordTypes: this.chordTypes };
  }

  toggle(value) {
    switch (value) {
      case "fixed":
        this._fixed = !this._fixed;
        break;
      case "invert":
        this._invert = !this._invert;
        break;
      case "labels":
        this._labels = !this._labels;
        break;
      case "tempo":
        this._tempo = !this._tempo;
      case "fx":
        this._fx = !this._fx;
        break;
    }
    this.save();
  }

  handleRhythm(state, id) {
    const handlePlus = () => {
      if (this._tempo) {
        this._rate = this.sounds.tempo("up");
      } else {
        this._rhythm = this.sounds.rhythmNext();
      }
    };
    const handleMinus = () => {
      if (this._tempo) {
        this._rate = this.sounds.tempo("down");
      } else {
        this._rhythm = this.sounds.rhythmPrev();
      }
    };
    const handleRhythm = () => {
      if (this.sounds.loaded) {
        this.sounds.triggerRhythm();
      }
    };
    if (state === "down") {
      switch (id) {
        case "tempo-plus":
          handlePlus();
          return;
        case "tempo-minus":
          handleMinus();
          return;
        case "rhythm":
          handleRhythm();
          return;
      }
    }
    this.save();
  }

  handlePad(areaId) {
    if (this.mode === "config") {
      this.actives[areaId] = this.actives[areaId] ? 0 : 1;
      this.save();
      return;
    }
    if (this.currentAreaId === areaId) {
      this.currentAreaId = undefined;
      this.sounds.triggerPadRelease(this.areas[areaId].chord);
    } else {
      if (this.currentAreaId) {
        this.sounds.triggerPadRelease(this.areas[this.currentAreaId].chord);
      }
      this.currentAreaId = areaId;
      this.sounds.triggerPadAttack(this.areas[areaId].chord);
    }
  }

  handleStepper(pointer, state, harpShape) {
    const relative = this.touch.relateArea(harpShape);
    const landscape = relative.w < relative.h;
    const area = this.areas[this.currentAreaId];
    this.previousStepIdx = this.currentStepIdx;
    if (area && state !== "up") {
      const perc = landscape
        ? (pointer.y - relative.y) / relative.h
        : (pointer.x - relative.x) / relative.w;
      let inc = 0;
      this.currentStepIdx = -1;
      const step = 1 / area.chord.stepper.length;
      area.chord.stepper.forEach(() => {
        inc += step;
        if (perc <= inc) {
          this.currentStepIdx++;
        }
      });
    } else {
      this.currentStepIdx = undefined;
    }
    if (
      state !== "up" &&
      this.currentStepIdx !== this.previousStepIdx &&
      this.currentStepIdx !== undefined
    ) {
      const index = landscape
        ? area.chord.stepper.length - 1 - this.currentStepIdx
        : this.currentStepIdx;
      this.sounds.triggerHarp(area.chord.stepper[index]);
    }
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
