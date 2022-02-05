import { Controller } from "./controller.js";
import { chordTypes, roots } from "./chords.js";
import { Sounds } from "./sounds.js";

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const toggleMode = document.getElementById("mode");
const toggleLabels = document.getElementById("labels");

const sounds = new Sounds();
const controller = new Controller(canvas);
updateDom();

function updateDom() {
  toggleLabels.innerText = controller.text("labels");
  toggleMode.innerText = controller.text("mode");
  if (controller.mode === "config") {
    toggleLabels.style.display = "initial";
  } else {
    toggleLabels.style.display = "none";
  }
}
toggleLabels.addEventListener("click", () => {
  controller.toggleLabels();
  updateDom();
});
toggleMode.addEventListener("click", () => {
  controller.toggleMode();
  updateDom();
  sounds.triggerPadReleaseAll();
});

sizeCanvas();
render();

function render() {
  requestAnimationFrame(render);
  const { height, width } = canvas;
  const isLandscape = width > height;
  context.fillStyle = "black";
  context.fillRect(0, 0, width, height);
  const chordShape = {
    w: isLandscape ? 0.75 : 1,
    h: isLandscape ? 1 : 0.75,
    x: 0,
    y: 0,
  };
  const harpShape = {
    w: isLandscape ? 0.25 : 1,
    h: isLandscape ? 1 : 0.25,
    x: isLandscape ? chordShape.w : 0,
    y: isLandscape ? 0 : chordShape.h,
  };
  const { chords } = controller.tick();
  const chordTypes = Object.keys(chords);
  const chordTypesCount = chordTypes.length;
  let relY = chordShape.y;
  let relX = chordShape.x;
  chordTypes.forEach((type) => {
    const chordForType = chords[type];
    const chordCount = chordForType.length;

    let size = (isLandscape ? chordShape.w : chordShape.h) / chordCount;
    const relW = isLandscape ? size : chordShape.w / chordTypesCount;
    const relH = isLandscape ? chordShape.h / chordTypesCount : size;
    chordForType.forEach((chord) => {
      const curr = controller.highlight(chord);
      const box = controller.addBox({
        id: chord.label,
        chord,
        x: relX,
        y: relY,
        w: relW,
        h: relH,
      });
      const fill = fillForChord(box.chord, curr);
      renderRectangle(box, fill, curr);
      if (controller.showLabels) {
        renderChordLabel(
          chord.label,
          curr,
          relW,
          relH,
          relX + relW * 0.5,
          relY + relH * 0.5,
          fillForChord(box.chord, curr, true)
        );
      }

      if (isLandscape) {
        relX += size;
      } else {
        relY += size;
      }
    });
    if (isLandscape) {
      relY += relH;
      relX = chordShape.x;
    } else {
      relX += relW;
      relY = chordShape.y;
    }
  });
  controller.addBox({ id: "stepper", ...harpShape });
  if (controller.currentBoxId) {
    const { chord } = controller.boxes[controller.currentBoxId];
    let size = (isLandscape ? harpShape.h : harpShape.w) / chord.stepper.length;
    relX = harpShape.x;
    relY = harpShape.y;
    const relW = isLandscape ? harpShape.w : size;
    const relH = isLandscape ? size : harpShape.h;
    chord.stepper.forEach((_, i) => {
      const shape = { x: relX, y: relY, w: relW, h: relH };
      const curr = i === controller.currentStepIdx;
      renderRectangle(shape, fillForChord(chord, curr), curr);
      if (isLandscape) {
        relY += size;
      } else {
        relX += size;
      }
    });
  } else {
    renderRectangle(harpShape, "rgba(255, 255, 255, 0.1)");
  }

  const boxesStates = controller.process();
  for (let boxId in boxesStates) {
    const { pointer, state } = boxesStates[boxId];
    if (state) {
      if (controller.touch.initialized) {
        if (boxId === "stepper") {
          handleStepper(pointer, state);
        } else if (state === "down") {
          handleChordClick(boxId);
        }
      }
    }
  }

  function handleChordClick(boxId) {
    const { attack, release } = controller.handleBox(boxId);
    if (release) {
      sounds.triggerPadRelease(release);
    }
    if (attack) {
      sounds.triggerPadAttack(attack);
    }
  }

  function handleStepper({ x, y }, state) {
    const { trigger } = controller.handleStepper({ x, y }, state, isLandscape);

    if (trigger) {
      sounds.triggerHarp(trigger);
    }
  }
}

function renderChordLabel(text, current, relW, relH, cx, cy, { r, g, b }) {
  const w = relW * canvas.width;
  const height = relH * canvas.height;
  const x = cx * canvas.width;
  const y = cy * canvas.height;
  const fontSize = Math.round(Math.min(w, height) * 0.3);
  context.fillStyle = current
    ? "rgba(255, 255, 255, 0.95)"
    : `rgba(${r}, ${g}, ${b}, 0.7)`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.save();
  context.shadowColor = current
    ? "rgba(255, 255, 255, 0.4)"
    : "rgba(0, 0, 0, 0.4)";
  context.shadowBlur = 1;
  context.shadowOffsetX = context.shadowOffsetY =
    fontSize * 0.05 * (current ? -1 : 1);
  context.font = `600 ${fontSize}px "Andale Mono",monospace`;
  context.fillText(text, x, y);
  context.restore();
}

function fillForChord(chord, isBright, object = false) {
  const a = isBright ? 1 : 0.4;
  const offset = chordTypes.indexOf(chord.type);
  const step = ((1 / 11) * 360) / chordTypes.length;
  const h = ((roots.indexOf(chord.notation) / 11) * 360 + offset * step) % 360;
  // const s = { maj: 0.8, min: 0.8, maj7: 0.8, dim: 0.8, aug: 0.8 }[chord.type];
  const s = 0.85;
  // const l = { maj: 0.7, min: 0.7, maj7: 0.7, dim: 0.7, aug: 0.7 }[chord.type];
  const l = 0.9;
  const rgb = hsvToRgb(h, s, l);
  return object
    ? { ...rgb, h, s, l, a }
    : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function renderRectangle({ w, h, x, y }, fill, glow) {
  const gutter = Math.min(canvas.width, canvas.height) * 0.005;
  w = w * canvas.width - gutter * 2;
  h = h * canvas.height - gutter * 2;
  context.save();
  if (glow) {
    context.shadowColor = fill;
    context.shadowBlur = gutter;
  }
  context.fillStyle = fill;
  context.fillRect(x * canvas.width + gutter, y * canvas.height + gutter, w, h);
  context.restore();
}

let debounced;
window.addEventListener("resize", () => {
  if (debounced) {
    clearTimeout(debounced);
  }
  debounced = setTimeout(sizeCanvas, 250);
});

function sizeCanvas() {
  canvas.height = window.innerHeight * 1.5;
  canvas.width = window.innerWidth * 1.5;
}

function hsvToRgb(h, s, v) {
  const C = v * s;
  const hh = h / 60.0;
  const X = C * (1.0 - Math.abs((hh % 2) - 1.0));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh >= 0 && hh < 1) {
    r = C;
    g = X;
  } else if (hh >= 1 && hh < 2) {
    r = X;
    g = C;
  } else if (hh >= 2 && hh < 3) {
    g = C;
    b = X;
  } else if (hh >= 3 && hh < 4) {
    g = X;
    b = C;
  } else if (hh >= 4 && hh < 5) {
    r = X;
    b = C;
  } else {
    r = C;
    b = X;
  }
  const m = v - C;
  r = Math.round((r + m) * 255.0);
  g = Math.round((g + m) * 255.0);
  b = Math.round((b + m) * 255.0);
  return { r, g, b };
}
