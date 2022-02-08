const SYNTH_SETTINGS = {
  oscillator: { type: "sawtooth16" },
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
  decay: 1.4,
  preDelay: 0.1,
};

export const RHYTHMS = [
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
    return new Promise(async (resolve) => {
      await Tone.start();

      this.loaded = false;
      this.rhythmIndex = Math.max(0, RHYTHMS.indexOf(rhythm));
      this.rate = rate;

      this.harpOut = new Tone.Gain(0.2).toDestination();
      const filter1 = new Tone.Filter(2000, "lowpass").connect(this.harpOut);
      const filter2 = new Tone.Filter(100, "highpass").connect(filter1);
      const reverb = new Tone.Reverb(REVERB_SETTINGS).connect(filter2);
      this.harpIn = new Tone.PingPongDelay(0.25, 0.3).connect(reverb);
      this.harpIn.wet.value = 0.3;
      this.harp = new Tone.PolySynth(Tone.Synth).connect(
        this.fx ? this.harpIn : this.harpOut
      );
      this.harp.polyphony = 16;
      this.harp.set(SYNTH_SETTINGS);

      this.synthOut = new Tone.Gain(0.2).toDestination();
      const filter3 = new Tone.Filter(2000, "lowpass").connect(this.synthOut);
      const filter4 = new Tone.Filter(100, "highpass").connect(filter3);
      this.synthIn = new Tone.Reverb(REVERB_SETTINGS).connect(filter4);
      this.synth = new Tone.PolySynth(Tone.Synth).connect(
        this.fx ? this.synthIn : this.synthOut
      );
      this.synth.polyphony = 6;
      this.synth.set(SYNTH_SETTINGS);

      this.rhythmOn = false;
      let load = RHYTHMS.length;
      this.rhythmOut = new Tone.Gain(1).toDestination();
      const filter5 = new Tone.Filter(2400, "lowpass").connect(this.rhythmOut);
      this.rhythmIn = new Tone.Filter(100, "highpass").connect(filter5);
      this.rhythms = RHYTHMS.map((rhythm) => {
        if (!rhythm) {
          load--;
          return undefined;
        }
        const player = new Tone.Player({
          url: `/samples/rhythm-${rhythm}.mp3`,
          loop: true,
          onload: () => {
            load--;
            if (load <= 0) {
              this.loaded = true;
              resolve();
            }
          },
        }).connect(this.fx ? this.rhythmIn : this.rhythmOut);
        player.playbackRate = rate;
        return player;
      });
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

  fxOn() {
    this.fx = true;
    this.rhythms.forEach((rhythm) => {
      rhythm.disconnect(this.rhythmOut);
      rhythm.connect(this.rhythmIn);
    });
    if (this.harp) {
      this.harp.disconnect(this.harpOut);
      this.harp.connect(this.harpIn);
    }
    if (this.synth) {
      this.synth.disconnect(this.synthOut);
      this.synth.connect(this.synthIn);
    }
  }

  fxOff() {
    this.fx = false;
    this.rhythms.forEach((rhythm) => {
      rhythm.connect(this.rhythmOut);
      rhythm.disconnect(this.rhythmIn);
    });
    if (this.harp) {
      this.harp.connect(this.harpOut);
      this.harp.disconnect(this.harpIn);
    }
    if (this.synth) {
      this.synth.connect(this.synthOut);
      this.synth.disconnect(this.synthIn);
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
    if (this.harp) {
      this.harp.triggerAttackRelease(note, 0.3);
    }
  }

  triggerPadAttack(chord) {
    if (this.synth) {
      this.synth.triggerAttack(chord.pad);
    }
  }

  triggerPadRelease(chord) {
    if (this.synth) {
      this.synth.triggerRelease(chord.pad);
    }
  }
}
