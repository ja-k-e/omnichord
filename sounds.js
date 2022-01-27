export class Sounds {
  constructor() {}

  triggerHarp(note) {
    if (!this.harp) {
      const gain = new Tone.Gain(0.4).toDestination();
      this.harp = new Tone.PolySynth().connect(gain);
    }
    this.harp.triggerAttackRelease(note, 0.5);
  }
  triggerPadAttack(chord) {
    if (!this.synth) {
      const gain = new Tone.Gain(0.4).toDestination();
      this.synth = new Tone.PolySynth().connect(gain);
    }
    this.synth.triggerAttack(chord.pad);
  }
  triggerPadRelease(chord) {
    this.synth.triggerRelease(chord.pad);
  }
}
