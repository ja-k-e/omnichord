import { intervalNotes } from "https://unpkg.com/musical-scale@1.0.3/index.js";
export const chords = {};

// export const chordTypes = ["maj", "min", "maj7"];
export const chordTypes = ["maj", "min", "maj7", "aug", "dim"];
const chordTypeLabels = {
  maj: "",
  min: "m",
  maj7: "7",
  aug: "+",
  dim: "°",
};
// prettier-ignore
export const roots = ["C" , "C#" , "D" , "D#" , "E" , "F" , "F#" , "G" , "G#" , "A" , "A#" , "B"];
const octaveMin = 2;
const octaveMax = 6;
const octavePad = 3;
chordTypes.forEach((type) => {
  chords[type] = [];
  roots.forEach((_, i) => chords[type].push(chordFromStepAndType(i, type)));
});

function chordFromNotes(notes, type) {
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
  const typeLabel = chordTypeLabels[type];
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
