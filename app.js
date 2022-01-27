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
  context.fillStyle = "black";
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

  let y = chordShape.y;
  let h = chordShape.h / chordTypes.length;
  data.boxes = {};
  chordTypes.forEach((type, i) => {
    const chordForType = chords[type];
    const chordCount = chordForType.length;
    const w = chordShape.w / chordCount;
    let x = chordShape.x;
    chordForType.forEach((chord, j) => {
      const alpha = j % 2 === 0 ? 0.1 : 0.2;
      const add = i % 2 === 0 ? 0.05 : 0;
      const id = i + "-" + j;
      const curr = id === data.currentBoxId;
      const fill = `hsla(0, 0%, ${curr ? 100 : 60}%, ${
        curr ? 1 : alpha + add
      })`;
      data.boxes[id] = { id, chord, x, y, w, h };
      renderRectangle(data.boxes[id], { fill });
      context.fillStyle = curr ? "black" : "white";
      context.textAlign = "center";
      context.font = "16px sans-serif";
      context.fillText(chord.label, x + w * 0.5, y + h * 0.5);
      x += w;
    });
    y += h;
  });
  data.boxes.stepper = { id: "stepper", ...harpShape };

  const boxesStates = touch.updatePointers(Object.values(data.boxes));
  for (let boxId in boxesStates) {
    const { pointer, state } = boxesStates[boxId];
    if (state) {
      if (touch.initialized) {
        if (boxId === "stepper") {
          handleStepper(pointer, state);
        } else {
          if (state === "down") {
            handleChordClick(boxId);
          }
          if (state !== "up") {
            // renderRectangle(data.boxes[boxId], {
            //   fill: "rgba(255,255,255,0.1)",
            // });
          }
        }
      }
    }
  }

  function handleStepper({ x, y }, state) {
    const box = data.boxes[data.currentBoxId];
    if (!box) {
      return;
    }
    const {
      chord: { stepper },
    } = box;
    const stepperCount = stepper.length;
    const a = isLandscape ? y : x;
    const b = isLandscape ? canvas.height : canvas.width;
    data.prevStepIdx = data.currStepIdx;
    data.currStepIdx =
      a !== undefined ? Math.floor((a / b) * stepperCount) : undefined;
    let size = (isLandscape ? harpShape.h : harpShape.w) / stepperCount;
    let relX = harpShape.x;
    let relY = harpShape.y;
    const relW = isLandscape ? harpShape.w : size;
    const relH = isLandscape ? size : harpShape.h;
    stepper.forEach((s, i) => {
      if (i === data.currStepIdx) {
        const shape = { x: relX, y: relY, w: relW, h: relH };
        renderRectangle(shape, { fill: "white" });
      }
      if (isLandscape) {
        relY += size;
      } else {
        relX += size;
      }
    });

    if (
      state !== "up" &&
      data.currStepIdx !== data.prevStepIdx &&
      data.currStepIdx !== undefined
    ) {
      sounds.triggerHarp(stepper[data.currStepIdx]);
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
  const octavePad = 3;
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
    stepper.reverse();
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
