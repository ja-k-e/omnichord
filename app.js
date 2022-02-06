import { Controller } from "./controller.js";
import { chordTypes, roots } from "./chords.js";
import { Sounds } from "./sounds.js";

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const nav = document.querySelector("nav");
const toggleFixed = document.getElementById("fixed");
const toggleInvert = document.getElementById("invert");
const toggleLabels = document.getElementById("labels");
const configLink = document.getElementById("config-link");

const sounds = new Sounds();
const controller = new Controller(canvas, () => {
  updateDom();
  sounds.triggerPadReleaseAll();
});
updateDom();

function updateDom() {
  toggleFixed.className = controller._fixed ? "active" : "";
  toggleInvert.className = controller._invert ? "active" : "";
  toggleLabels.className = controller._labels ? "active" : "";
  if (controller.mode === "config") {
    nav.style.display = "flex";
    configLink.href = "#";
    configLink.innerText = "Play!";
  } else {
    nav.style.display = "none";
    configLink.href = "#config";
    configLink.innerText = "Configure";
  }
}
toggleFixed.addEventListener("click", () => {
  controller.toggleFixed();
  updateDom();
});
toggleInvert.addEventListener("click", () => {
  controller.toggleInvert();
  updateDom();
});
toggleLabels.addEventListener("click", () => {
  controller.toggleLabels();
  updateDom();
});

sizeCanvas();
render();

function render() {
  requestAnimationFrame(render);
  const { height, width } = canvas;
  const isLandscape = width > height;
  const isInvert = controller._invert;
  const bg = controller.currentBoxId
    ? fillForChord(controller.boxes[controller.currentBoxId].chord, {
        isDark: true,
      })
    : "black";
  document.body.style.background = bg;
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);
  const chordShape = controller.touch.relative({
    w: isLandscape ? 0.75 : 1,
    h: isLandscape ? 1 : 0.75,
    x: isInvert ? (isLandscape ? 0.25 : 0) : 0,
    y: isInvert ? (isLandscape ? 0 : 0.25) : 0,
  });
  const harpShape = controller.touch.relative({
    w: isLandscape ? 0.25 : 1,
    h: isLandscape ? 1 : 0.25,
    x: isInvert ? 0 : isLandscape ? 0.75 : 0,
    y: isInvert ? 0 : isLandscape ? 0 : 0.75,
  });
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
      // chord is null in fixed view
      if (chord) {
        const curr = controller.highlight(chord);
        const box = controller.addBox({
          id: chord.label,
          chord,
          x: relX,
          y: relY,
          w: relW,
          h: relH,
        });
        const fill = fillForChord(box.chord, { isBright: curr });
        renderRectangle(box, fill, curr);
        if (controller._labels) {
          const fill = fillForChord(box.chord, {
            isBright: curr,
            object: true,
          });
          renderChordLabel(chord.label, curr, relW, relH, relX, relY, fill);
        }
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
      renderRectangle(shape, fillForChord(chord, { isBright: curr }), curr);
      if (isLandscape) {
        relY += size;
      } else {
        relX += size;
      }
    });
  } else {
    renderRectangle(harpShape, "rgba(255, 255, 255, 0.05)");
  }
  const { X_RAT, Y_RAT } = controller.touch.dimensions();
  const { x, y, w, h } = controller.touch.relative(harpShape);
  document.body.style.setProperty("--harp-height", h * 100 + "%");
  document.body.style.setProperty("--harp-width", w * 100 + "%");
  document.body.style.setProperty("--harp-left", x * 100 + "%");
  document.body.style.setProperty("--harp-top", y * 100 + "%");
  document.body.style.setProperty("--gutter-width", X_RAT * 100 + "%");
  document.body.style.setProperty("--gutter-height", Y_RAT * 100 + "%");

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

function renderChordLabel(text, current, relW, relH, relX, relY, { r, g, b }) {
  const { W, H, X, Y } = controller.touch.dimensions();
  const w = relW * W;
  const h = relH * H;
  const x = w * 0.5 + relX * W + X;
  const y = h * 0.5 + relY * H + Y;
  const fontSize = Math.round(Math.min(w, h) * 0.3);
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
  context.font = `600 ${fontSize}px "Andale Mono", "Trebuchet MS", "Lucida Sans Unicode", monospace`;
  context.fillText(text, x, y);
  context.restore();
}

function fillForChord(chord, { isBright, isDark, object } = {}) {
  const a = 1;
  const offset = chordTypes.indexOf(chord.type);
  const step = ((1 / 11) * 360) / chordTypes.length;
  const h = ((roots.indexOf(chord.notation) / 11) * 360 + offset * step) % 360;
  const s = 0.85;
  const l = isBright ? 0.95 : isDark ? 0.2 : 0.3;
  const rgb = hsvToRgb(h, s, l);
  return object
    ? { ...rgb, h, s, l, a }
    : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function renderRectangle({ w, h, x, y }, fill, glow) {
  const { gutter, X, Y, W, H } = controller.touch.dimensions();
  w = w * W - gutter * 2;
  h = h * H - gutter * 2;
  x = x * W + gutter + X;
  y = y * H + gutter + Y;
  context.save();
  if (glow) {
    context.shadowColor = fill;
    context.shadowBlur = gutter;
  }
  context.fillStyle = fill;
  context.fillRect(x, y, w, h);
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
