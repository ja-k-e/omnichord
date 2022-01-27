export class Sounds {
  constructor() {
    this.currentChord = null;
  }

  triggerPadAttack(chord) {
    if (!this.synth) {
      const gain = new Tone.Gain(0.4).toDestination();
      this.synth = new Tone.PolySynth().connect(gain);
    }
    this.currentChord = chord;
    this.synth.triggerAttack(chord.pad);
  }
  triggerPadRelease(chord) {
    delete this.currentChord;
    this.synth.triggerRelease(chord.pad);
  }
}
