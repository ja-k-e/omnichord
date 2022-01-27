import { intervalNotes } from "https://unpkg.com/musical-scale@1.0.3/index.js";
import { Sounds } from "./sounds.js";
import { Touch } from "./touch.js";

const chords = getChords();
const chordTypes = Object.keys(chords);
const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

const touch = new Touch(canvas, () => Tone.start());
const sounds = new Sounds();

const data = {};

sizeCanvas();
render();

function render() {
  requestAnimationFrame(render);
  const { height, width } = canvas;
  const isLandscape = width > height;
  context.fillRect(0, 0, width, height);
  const chordShape = {
    w: isLandscape ? width * 0.75 : width,
    h: isLandscape ? height : height * 0.75,
    x: 0,
    y: 0,
  };
  const harpShape = {
    w: isLandscape ? width * 0.25 : width,
    h: isLandscape ? height : height * 0.25,
    x: isLandscape ? chordShape.w : 0,
    y: isLandscape ? 0 : chordShape.h,
  };
  renderRectangle(chordShape, { fill: "black" });
  renderRectangle(harpShape, { fill: "yellow" });

  let y = chordShape.y;
  const h = chordShape.h / chordTypes.length;
  data.boxes = {};
  chordTypes.forEach((type, i) => {
    const chordForType = chords[type];
    const chordCount = chordForType.length;
    const w = chordShape.w / chordCount;
    let x = chordShape.x;
    const hue = 360 * (i / chordTypes.length);
    chordForType.forEach((chord, j) => {
      const alpha = j % 2 === 0 ? 0.4 : 0.5;
      const id = i + "-" + j;
      const fill = `hsla(${hue}, 100%, 60%, ${
        id === data.currentBoxId ? 1 : alpha
      })`;
      data.boxes[id] = { id, chord, x, y, w, h };
      renderRectangle({ x, y, w, h }, { fill });
      context.fillStyle = "white";
      context.textAlign = "center";
      context.font = "16px sans-serif";
      context.fillText(chord.label, x + w * 0.5, y + h * 0.5);
      x += w;
    });
    y += h;
  });
  const boxesStates = touch.updatePointers(Object.values(data.boxes));
  for (let boxId in boxesStates) {
    const state = boxesStates[boxId];
    if (state) {
      if (touch.initialized) {
        if (state === "down") {
          handleChordClick(boxId);
        }
        if (state !== "up") {
          renderRectangle(data.boxes[boxId], { fill: "rgba(255,255,255,0.1)" });
        }
      }
    }
  }
}

function handleChordClick(boxId) {
  const chord = data.boxes[boxId].chord;
  const currentChord = data.currentBoxId
    ? data.boxes[data.currentBoxId].chord
    : null;
  if (currentChord && currentChord.label === chord.label) {
    delete data.currentBoxId;
    sounds.triggerPadRelease(chord);
  } else {
    if (currentChord) {
      sounds.triggerPadRelease(currentChord);
    }
    data.currentBoxId = boxId;
    sounds.triggerPadAttack(chord);
  }
}

function renderRectangle({ w, h, x, y }, { fill = "black" }) {
  context.fillStyle = fill;
  context.fillRect(x, y, w, h);
}

let debounced;
window.addEventListener("resize", () => {
  if (debounced) {
    clearTimeout(debounced);
  }
  debounced = setTimeout(sizeCanvas, 250);
});

function sizeCanvas() {
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
}

function getChords() {
  // const types = ["maj", "min", "maj7", "aug", "dim"];
  const types = ["maj", "min", "maj7"];
  // prettier-ignore
  const roots = ["C" , "C#" , "D" , "D#" , "E" , "F" , "F#" , "G" , "G#" , "A" , "A#" , "B"];
  const chords = {};
  const octaveMin = 2;
  const octaveMax = 6;
  const octavePad = 4;
  types.forEach((type) => {
    chords[type] = [];
    roots.forEach((_, i) => chords[type].push(chordFromStepAndType(i, type)));
  });

  function chordFromNotes(notes, type) {
    const pad = notes.map(({ notation, octave }) => {
      return `${notation}${octavePad + octave}`;
    });
    const stepper = [];
    for (let o = octaveMin; o <= octaveMax; o++) {
      notes.forEach(({ notation, octave }) => {
        if (o + octave <= octaveMax) {
          stepper.push(`${notation}${o + octave}`);
        }
      });
    }
    const typeLabel =
      type === "maj7" ? "7" : type === "maj" ? "" : type.charAt(0);
    const label = notes[0].notation + typeLabel;
    return { label, notation: notes[0].notation, type, pad, stepper };
  }

  function chordFromStepAndType(rootIdx, type) {
    if (type === "maj7") {
      const notes = intervalNotes(rootIdx, 0, "maj");
      const indexMin = roots.indexOf(notes[1].notation);
      const min = intervalNotes(indexMin, notes[1].octave, "min");
      return chordFromNotes(notes.concat(min[2]), type);
    }
    return chordFromNotes(intervalNotes(rootIdx, 0, type), type);
  }

  return chords;
}
