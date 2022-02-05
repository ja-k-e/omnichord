import { Controller } from "./controller.js";
import { Sounds } from "./sounds.js";

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const toggle = document.getElementById("mode");

const sounds = new Sounds();
const controller = new Controller(canvas);
controller.toggleMode(toggle, "config");
toggle.addEventListener("click", () => {
  controller.toggleMode(toggle);
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
  chordTypes.forEach((type, i) => {
    const chordForType = chords[type];
    const chordCount = chordForType.length;

    let size = (isLandscape ? chordShape.w : chordShape.h) / chordCount;
    const relW = isLandscape ? size : chordShape.w / chordTypesCount;
    const relH = isLandscape ? chordShape.h / chordTypesCount : size;
    chordForType.forEach((chord, j) => {
      const alpha = j % 2 === 0 ? 0.1 : 0.2;
      const add = i % 2 === 0 ? 0.05 : 0;
      const curr = controller.highlight(chord);
      const fill = `hsla(0, 0%, ${curr ? 100 : 60}%, ${
        curr ? 1 : alpha + add
      })`;
      const box = controller.addBox({
        id: chord.label,
        chord,
        x: relX,
        y: relY,
        w: relW,
        h: relH,
      });
      renderRectangle(box, { fill });
      context.fillStyle = curr ? "black" : "#777";
      context.textAlign = "center";
      context.font = `bold ${Math.round(canvas.width * 0.01)}px sans-serif`;
      renderText(chord.label, relX + relW * 0.5, relY + relH * 0.5);

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
    const { box, currentStepIdx, trigger } = controller.handleStepper(
      { x, y },
      state,
      isLandscape
    );

    if (!box) {
      return;
    }
    const {
      chord: { stepper },
    } = box;
    let size = (isLandscape ? harpShape.h : harpShape.w) / stepper.length;
    let relX = harpShape.x;
    let relY = harpShape.y;
    const relW = isLandscape ? harpShape.w : size;
    const relH = isLandscape ? size : harpShape.h;
    stepper.forEach((_, i) => {
      if (i === currentStepIdx) {
        const shape = { x: relX, y: relY, w: relW, h: relH };
        renderRectangle(shape, { fill: "white" });
      }
      if (isLandscape) {
        relY += size;
      } else {
        relX += size;
      }
    });

    if (trigger) {
      sounds.triggerHarp(trigger);
    }
  }
}

function renderText(text, x, y) {
  context.fillText(text, x * canvas.width, y * canvas.height);
}

function renderRectangle({ w, h, x, y }, { fill = "black" }) {
  context.fillStyle = fill;
  context.fillRect(
    x * canvas.width,
    y * canvas.height,
    w * canvas.width,
    h * canvas.height
  );
}

let debounced;
window.addEventListener("resize", () => {
  if (debounced) {
    clearTimeout(debounced);
  }
  debounced = setTimeout(sizeCanvas, 250);
});

function sizeCanvas() {
  canvas.height = window.innerHeight * 2;
  canvas.width = window.innerWidth * 2;
}
