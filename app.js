import { Controller } from "./controller.js";
import { chordTypes, roots } from "./chords.js";

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const nav = document.querySelector("nav");
const toggleFixed = document.getElementById("fixed");
const toggleInvert = document.getElementById("invert");
const toggleLabels = document.getElementById("labels");
const toggleTempo = document.getElementById("tempo");
const configLink = document.getElementById("config-link");

const controller = new Controller(canvas, () => updateDom());
updateDom();

function updateDom() {
  toggleFixed.className = controller._fixed ? "active" : "";
  toggleLabels.className = controller._labels ? "active" : "";
  toggleTempo.className = "active";
  toggleTempo.innerText = controller._tempo ? "Tempo" : "Pattern";
  if (controller.mode === "config") {
    nav.classList.add("config");
    configLink.href = "#";
    configLink.text = "Perform";
  } else {
    nav.classList.remove("config");
    configLink.href = "#config";
    configLink.text = "Config";
  }
}
configLink.addEventListener("click", () =>
  controller.touch.handleAnyEventOccurred()
);
toggleFixed.addEventListener("click", () => {
  controller.toggle("fixed");
  updateDom();
});
toggleInvert.addEventListener("click", () => {
  controller.toggle("invert");
  updateDom();
});
toggleLabels.addEventListener("click", () => {
  controller.toggle("labels");
  updateDom();
});
toggleTempo.addEventListener("click", () => {
  controller.toggle("tempo");
  updateDom();
});

sizeCanvas();
render();

function render() {
  requestAnimationFrame(render);
  const { height, width } = canvas;
  const isLandscape = width > height;
  const isInvert = controller._invert;
  const showDrums = controller.mode === "config";
  const showTempo = controller.mode === "config";
  const shapeFromShapes = (shapes) => {
    const shape = isLandscape ? shapes.landscape : shapes.portrait;
    return {
      w: shape.w,
      h: shape.h,
      x: isInvert ? shape.xInvert : shape.x,
      y: isInvert ? shape.yInvert : shape.y,
    };
  };
  const chordShape = shapeFromShapes({
    landscape: {
      w: 0.8,
      h: 1,
      x: 0,
      xInvert: 0.2,
      y: 0,
      yInvert: 0,
    },
    portrait: {
      w: 1,
      h: 0.8,
      x: 0,
      xInvert: 0,
      y: 0,
      yInvert: 0.2,
    },
  });
  const drumShape = shapeFromShapes({
    landscape: {
      w: 0.2,
      h: 0.2,
      x: 0.8,
      xInvert: 0,
      y: 0,
      yInvert: 0,
    },
    portrait: {
      w: 1,
      h: 0.05,
      x: 0,
      xInvert: 0,
      y: 0.8,
      yInvert: 0.15,
    },
  });
  const harpShape = shapeFromShapes({
    landscape: {
      w: 0.2,
      h: showDrums ? 0.8 : 1,
      x: 0.8,
      xInvert: 0,
      y: showDrums ? 0.2 : 0,
      yInvert: showDrums ? 0.2 : 0,
    },
    portrait: {
      w: 1,
      h: showDrums ? 0.15 : 0.2,
      x: 0,
      xInvert: 0,
      y: showDrums ? 0.85 : 0.8,
      yInvert: 0,
    },
  });

  const currentChord =
    controller.currentAreaId && controller.areas[controller.currentAreaId]
      ? controller.areas[controller.currentAreaId].chord
      : null;
  nav.style.display = currentChord ? "none" : "flex";
  const currentFillBright = currentChord
    ? fillForChord(currentChord, { isBright: true })
    : "white";
  const currentFill = fillForChord(currentChord, {});
  const currentFillDark = fillForChord(currentChord, { isDark: true });
  document.body.style.background = currentFillDark;
  context.fillStyle = currentFillDark;
  context.fillRect(0, 0, width, height);

  const { chords } = controller.tick();

  if (showDrums) {
    const texts = {
      "tempo-minus": {
        arrow: "◀",
        tempo: "-",
      },
      "tempo-plus": {
        arrow: "▶",
        tempo: "+",
      },
      rhythm: controller._rhythm || "NONE",
    };
    const showLabels = controller._labels || controller.mode === "config";
    if (showTempo) {
      const plus = controller.addArea({
        id: "tempo-plus",
        x: isLandscape
          ? 0.5 * drumShape.w + drumShape.x
          : 0.8 * drumShape.w + drumShape.x,
        y: isLandscape ? 0.5 * drumShape.h + drumShape.y : drumShape.y,
        w: isLandscape ? 0.5 * drumShape.w : 0.2 * drumShape.w,
        h: isLandscape ? 0.5 * drumShape.h : drumShape.h,
      });
      const minus = controller.addArea({
        id: "tempo-minus",
        x: drumShape.x,
        y: isLandscape ? 0.5 * drumShape.h + drumShape.y : drumShape.y,
        w: isLandscape ? 0.5 * drumShape.w : 0.2 * drumShape.w,
        h: isLandscape ? 0.5 * drumShape.h : drumShape.h,
      });
      renderRectangle(
        plus,
        fillForChord(currentChord, {
          isBright: controller.sounds.rhythmOn,
        }),
        controller.sounds.rhythmOn
      );
      renderRectangle(
        minus,
        fillForChord(currentChord, {
          isBright: controller.sounds.rhythmOn,
        }),
        controller.sounds.rhythmOn
      );
      if (showLabels) {
        const which =
          controller.mode === "config"
            ? controller._tempo
              ? "tempo"
              : "arrow"
            : "tempo";
        renderChordLabel(
          { ...plus, id: texts[plus.id][which] },
          fillForChord(currentChord, {
            isBright: controller.sounds.rhythmOn,
            object: true,
          }),
          controller.sounds.rhythmOn || controller.mode === "config"
        );
        renderChordLabel(
          { ...minus, id: texts[minus.id][which] },
          fillForChord(currentChord, {
            isBright: controller.sounds.rhythmOn,
            object: true,
          }),
          controller.sounds.rhythmOn || controller.mode === "config"
        );
      }
    }

    const rhythmOffset = showTempo ? 0.2 : 0;
    const rhythmSize = showTempo ? 0.6 : 1;
    const rhythm = controller.addArea({
      id: "rhythm",
      x: isLandscape ? drumShape.x : drumShape.x + rhythmOffset * drumShape.w,
      y: drumShape.y,
      w: isLandscape ? drumShape.w : rhythmSize * drumShape.w,
      h: isLandscape ? 0.5 * drumShape.h : drumShape.h,
    });
    const txt = controller.sounds.loaded
      ? texts[rhythm.id]
      : controller.sounds.loaded === undefined
      ? "load"
      : "loading...";
    renderRectangle(
      rhythm,
      fillForChord(currentChord, {
        isBright: controller.sounds.rhythmOn,
      }),
      controller.sounds.rhythmOn
    );
    if (!controller.sounds.loaded || showLabels) {
      renderChordLabel(
        { ...rhythm, id: txt },
        fillForChord(currentChord, {
          isBright: controller.sounds.rhythmOn,
          object: true,
        }),
        controller.sounds.rhythmOn || controller.mode === "config",
        !controller.sounds.loaded,
        40
      );
    }
  }

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
        const highlighted = controller.highlight(chord);
        const area = controller.addArea({
          id: chord.label,
          chord,
          x: relX,
          y: relY,
          w: relW,
          h: relH,
        });
        renderRectangle(
          area,
          fillForChord(area.chord, { isBright: highlighted }),
          highlighted
        );
        if (controller._labels) {
          renderChordLabel(
            area,
            fillForChord(area.chord, {
              isBright: highlighted,
              object: true,
            }),
            highlighted
          );
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
  controller.addArea({ id: "stepper", ...harpShape });
  if (currentChord) {
    let size =
      (isLandscape ? harpShape.h : harpShape.w) / currentChord.stepper.length;
    const activeIndex =
      currentChord.stepper.length - 1 - controller.currentStepIdx;
    relX = harpShape.x;
    relY = harpShape.y;
    const relW = isLandscape ? harpShape.w : size;
    const relH = isLandscape ? size : harpShape.h;
    currentChord.stepper.forEach((_, i) => {
      const shape = { x: relX, y: relY, w: relW, h: relH };
      const curr = i === activeIndex;
      renderRectangle(shape, curr ? currentFillBright : currentFill, curr);
      if (isLandscape) {
        relY += size;
      } else {
        relX += size;
      }
    });
  } else {
    renderRectangle(harpShape, currentFill);
  }
  const { X_RAT, Y_RAT } = controller.touch.dimensions();
  const { x, y, w, h } = controller.touch.relateArea(harpShape);
  document.body.style.setProperty("--harp-height", h * 100 + "%");
  document.body.style.setProperty("--harp-width", w * 100 + "%");
  document.body.style.setProperty("--harp-left", x * 100 + "%");
  document.body.style.setProperty("--harp-top", y * 100 + "%");
  document.body.style.setProperty("--gutter-width", X_RAT * 100 + "%");
  document.body.style.setProperty("--gutter-height", Y_RAT * 100 + "%");

  controller.process(harpShape);
}

function renderChordLabel(
  { id: text, x: relX, y: relY, w: relW, h: relH },
  { r, g, b },
  highlighted,
  italic,
  maxFontSize = Infinity
) {
  const { W, H, X, Y } = controller.touch.dimensions();
  const w = relW * W;
  const h = relH * H;
  const x = w * 0.5 + relX * W + X;
  const y = h * 0.5 + relY * H + Y;
  const fontSize = Math.min(maxFontSize, Math.round(Math.min(w, h) * 0.25));
  context.fillStyle = highlighted
    ? "rgba(255, 255, 255, 0.95)"
    : `rgba(${r}, ${g}, ${b}, 0.7)`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.save();
  context.translate(x, y);
  context.shadowColor = highlighted
    ? "rgba(255, 255, 255, 0.4)"
    : "rgba(0, 0, 0, 0.4)";
  context.shadowBlur = 1;
  context.shadowOffsetX = context.shadowOffsetY =
    fontSize * 0.05 * (highlighted ? -1 : 1);
  context.font = `${
    italic ? "italic" : ""
  } 600 ${fontSize}px "Andale Mono", "Trebuchet MS", "Lucida Sans Unicode", monospace`;
  context.fillText(text, 0, 0);
  context.restore();
}

function fillForChord(chord, { isBright, isDark, object } = {}) {
  let h;
  let s;
  let lFact = 1;
  if (!chord) {
    h = 0;
    s = 0;
    lFact = 0.7;
  } else {
    const offset = chordTypes.indexOf(chord.type);
    const step = ((1 / 11) * 360) / chordTypes.length;
    h = ((roots.indexOf(chord.notation) / 11) * 360 + offset * step) % 360;
    s = 0.85;
  }
  const a = 1;
  const l = (isBright ? 0.95 : isDark ? 0.2 : 0.3) * lFact;
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
  document.body.classList.add("resizing");
  if (debounced) {
    clearTimeout(debounced);
  }
  debounced = setTimeout(sizeCanvas, 250);
});

function sizeCanvas() {
  canvas.height = window.innerHeight * 2;
  canvas.width = window.innerWidth * 2;
  document.body.classList.remove("resizing");
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
