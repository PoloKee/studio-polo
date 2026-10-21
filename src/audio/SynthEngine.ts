/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SynthVoiceConfig {
  oscType1: OscillatorType;
  oscType2: OscillatorType;
  detune: number; // cents
  filterCutoff: number; // Hz
  filterResonance: number; // Q
  attack: number; // s
  decay: number; // s
  sustain: number; // 0-1
  release: number; // s
}

export const DEFAULT_SYNTH_CONFIG: SynthVoiceConfig = {
  oscType1: 'sawtooth',
  oscType2: 'square',
  detune: 7,
  filterCutoff: 3200,
  filterResonance: 3,
  attack: 0.02,
  decay: 0.25,
  sustain: 0.6,
  release: 0.35,
};

export class SynthEngine {
  private ctx: AudioContext;
  private outputNode: GainNode;
  private activeVoices: Map<number, { stop: () => void }> = new Map();
  public config: SynthVoiceConfig = { ...DEFAULT_SYNTH_CONFIG };

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.outputNode = output;
  }

  public noteOn(midiPitch: number, velocity: number = 100) {
    // Stop prior note if playing
    this.noteOff(midiPitch);

    const freq = 440 * Math.pow(2, (midiPitch - 69) / 12);
    const now = this.ctx.currentTime;
    const velGain = (velocity / 127) * 0.4;

    // Create Oscillators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = this.config.oscType1;
    osc2.type = this.config.oscType2;
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq, now);
    osc2.detune.setValueAtTime(this.config.detune, now);

    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.config.filterCutoff, now);
    filter.Q.setValueAtTime(this.config.filterResonance, now);

    // Amp Envelope
    const ampGain = this.ctx.createGain();
    ampGain.gain.setValueAtTime(0.0001, now);
    ampGain.gain.exponentialRampToValueAtTime(velGain, now + Math.max(0.005, this.config.attack));
    ampGain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, velGain * this.config.sustain),
      now + Math.max(0.01, this.config.attack + this.config.decay)
    );

    // Routing
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(ampGain);
    ampGain.connect(this.outputNode);

    osc1.start(now);
    osc2.start(now);

    const stop = () => {
      const releaseTime = this.ctx.currentTime;
      ampGain.gain.cancelScheduledValues(releaseTime);
      ampGain.gain.setValueAtTime(ampGain.gain.value, releaseTime);
      ampGain.gain.exponentialRampToValueAtTime(0.0001, releaseTime + Math.max(0.01, this.config.release));
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
          filter.disconnect();
          ampGain.disconnect();
        } catch {
          // cleanup
        }
      }, (this.config.release + 0.05) * 1000);
    };

    this.activeVoices.set(midiPitch, { stop });
  }

  public noteOff(midiPitch: number) {
    const voice = this.activeVoices.get(midiPitch);
    if (voice) {
      voice.stop();
      this.activeVoices.delete(midiPitch);
    }
  }

  public allNotesOff() {
    this.activeVoices.forEach(v => v.stop());
    this.activeVoices.clear();
  }

  // Trigger drum sounds
  public triggerDrum(instrument: 'kick' | 'snare' | 'hihat' | 'openhat' | 'clap' | 'tom' | 'crash') {
    const now = this.ctx.currentTime;

    switch (instrument) {
      case 'kick': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.outputNode);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }
      case 'snare': {
        // Tone
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(oscGain);
        oscGain.connect(this.outputNode);
        osc.start(now);
        osc.stop(now + 0.18);

        // Noise
        const bufferSize = this.ctx.sampleRate * 0.2;
        const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        noise.connect(noiseGain);
        noiseGain.connect(this.outputNode);
        noise.start(now);
        break;
      }
      case 'hihat': {
        const bufferSize = this.ctx.sampleRate * 0.05;
        const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.outputNode);
        noise.start(now);
        break;
      }
      case 'openhat': {
        const bufferSize = this.ctx.sampleRate * 0.3;
        const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.outputNode);
        noise.start(now);
        break;
      }
      case 'clap': {
        for (let i = 0; i < 3; i++) {
          const t = now + i * 0.012;
          const bufSize = this.ctx.sampleRate * 0.04;
          const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
          const data = noiseBuf.getChannelData(0);
          for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          noise.connect(gain);
          gain.connect(this.outputNode);
          noise.start(t);
        }
        break;
      }
      case 'tom': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.outputNode);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }
      case 'crash': {
        const bufferSize = this.ctx.sampleRate * 0.8;
        const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(5000, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.outputNode);
        noise.start(now);
        break;
      }
    }
  }
}
