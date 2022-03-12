import {
  chordFromStepAndType,
  CHORD_TYPES,
  STEP_NOTATIONS,
} from "https://unpkg.com/musical-scale@1.0.4/index.js";
export const chords = {};
export const chordTypes = CHORD_TYPES;
export const roots = STEP_NOTATIONS;
const octaveMin = 2;
const octaveMax = 6;
const octavePad = 3;
chordTypes.forEach((type) => {
  chords[type] = [];
  roots.forEach((_, i) => {
    const chord = chordFromStepAndType(i, type);
    chords[type].push(chordWithPadAndStepper(chord));
  });
});

function chordWithPadAndStepper(chord) {
  const { notes } = chord;
  const pad = [`${notes[0].notation}${octaveMin}`].concat(
    notes.map(({ notation, octave }) => {
      return `${notation}${octavePad + octave}`;
    })
  );
  const stepper = [];
  for (let o = octaveMin; o <= octaveMax; o++) {
    notes.forEach(({ notation, octave }) => {
      if (o + octave <= octaveMax) {
        stepper.push(`${notation}${o + octave}`);
      }
    });
  }
  stepper.reverse();
  return { ...chord, pad, stepper };
}
