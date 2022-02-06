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

export const RHYTHMS = [
  undefined,
  "foxtrot",
  "latin",
  "rock",
  "slowrock",
  "swing",
  "waltz",
];

export class Sounds {
  constructor() {
    this.rhythms = [];
    this.loaded = undefined;
  }

  initialize(rhythm, rate) {
    this.loaded = false;
    this.rhythmIndex = Math.max(0, RHYTHMS.indexOf(rhythm));
    this.rate = rate;
    this.rhythmOn = false;
    let load = RHYTHMS.length;
    this.rhythms = RHYTHMS.map((rhythm) => {
      if (!rhythm) {
        load--;
        return undefined;
      }
      const gain = new Tone.Gain(0.8).toDestination();
      const player = new Tone.Player({
        url: `/samples/rhythm-${rhythm}.mp3`,
        loop: true,
        onload: () => {
          load--;
          if (load <= 0) this.loaded = true;
        },
      }).connect(gain);
      player.playbackRate = rate;
      return player;
    });
  }

  rhythmNext() {
    if (this.rhythmOn && this.rhythms[this.rhythmIndex]) {
      this.rhythms[this.rhythmIndex].stop();
    }
    this.rhythmIndex++;
    if (this.rhythmIndex >= RHYTHMS.length) {
      this.rhythmIndex = 0;
    }
    this.handleRhythmChange();
    return RHYTHMS[this.rhythmIndex];
  }
  rhythmPrev() {
    if (this.rhythmOn && this.rhythms[this.rhythmIndex]) {
      this.rhythms[this.rhythmIndex].stop();
    }
    this.rhythmIndex--;
    if (this.rhythmIndex < 0) {
      this.rhythmIndex = RHYTHMS.length - 1;
    }
    this.handleRhythmChange();
    return RHYTHMS[this.rhythmIndex];
  }
  handleRhythmChange() {
    if (this.rhythmOn && this.rhythms[this.rhythmIndex]) {
      this.rhythms[this.rhythmIndex].start();
    } else if (this.rhythmOn) {
      this.rhythmOn = false; // is empty
    }
  }

  stopAll() {
    if (this.synth) {
      this.synth.releaseAll();
    }
  }

  triggerRhythm() {
    const rhythm = this.rhythms[this.rhythmIndex];
    if (!rhythm) {
      return;
    }
    if (this.rhythmOn) {
      rhythm.stop();
    } else {
      rhythm.start();
    }
    this.rhythmOn = !this.rhythmOn;
  }

  tempo(upOrDown) {
    const factor = upOrDown === "up" ? 1.05 : 0.95;
    const rate = this.rhythms[1].playbackRate * factor;
    this.rhythms.forEach((player) => {
      if (player) {
        player.playbackRate = rate;
      }
    });
    return rate;
  }

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
