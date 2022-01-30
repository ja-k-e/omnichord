const SYNTH_SETTINGS = {
  oscillator: { type: "sawtooth4" },
  envelope: {
    attack: 0.1,
    attackCurve: "exponential",
    decay: 0.3,
    release: 1,
    sustain: 0.6,
  },
};

const REVERB_SETTINGS = {
  wet: 0.5,
  decay: 1.2,
  preDelay: 0.1,
};

export class Sounds {
  triggerHarp(note) {
    if (!this.harp) {
      const gain = new Tone.Gain(0.2).toDestination();
      const reverb = new Tone.Reverb(REVERB_SETTINGS).connect(gain);
      const delay = new Tone.PingPongDelay(0.25, 0.3).connect(reverb);
      delay.wet.value = 0.25;
      this.harp = new Tone.PolySynth(Tone.Synth).connect(delay);
      this.harp.set(SYNTH_SETTINGS);
    }
    this.harp.triggerAttackRelease(note, 0.5);
  }
  triggerPadAttack(chord) {
    if (!this.synth) {
      const gain = new Tone.Gain(0.3).toDestination();
      const reverb = new Tone.Reverb(REVERB_SETTINGS).connect(gain);
      this.synth = new Tone.PolySynth(Tone.Synth).connect(reverb);
      this.synth.set(SYNTH_SETTINGS);
    }
    this.synth.triggerAttack(chord.pad);
  }
  triggerPadRelease(chord) {
    this.synth.triggerRelease(chord.pad);
  }
}
