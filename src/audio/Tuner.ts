/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface TunerResult {
  frequency: number;
  note: string;
  octave: number;
  cents: number; // -50 to +50
  inTune: boolean;
}

/**
 * Auto-correlation pitch detector for live input (tuner)
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): TunerResult | null {
  const SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Noise gate - ignore silence/very low noise
  if (rms < 0.01) return null;

  // Autocorrelation algorithm
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;

  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }

  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const buf = buffer.slice(r1, r2);
  const c = new Float32Array(buf.length);

  for (let i = 0; i < buf.length; i++) {
    for (let j = 0; j < buf.length - i; j++) {
      c[i] = c[i] + buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;

  for (let i = d; i < buf.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  if (T0 === -1 || T0 === 0) return null;

  // Parabolic interpolation for fine tuning
  const x1 = c[T0 - 1] || 0;
  const x2 = c[T0];
  const x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) {
    T0 = T0 - b / (2 * a);
  }

  const freq = sampleRate / T0;
  if (freq < 20 || freq > 4000) return null; // Outside musical range

  // Convert Hz to MIDI note
  // A4 = 440Hz = MIDI 69
  const midiNote = Math.round(12 * (Math.log2(freq / 440))) + 69;
  const noteName = NOTE_NAMES[midiNote % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  const idealFreq = 440 * Math.pow(2, (midiNote - 69) / 12);
  const cents = Math.round(1200 * Math.log2(freq / idealFreq));

  return {
    frequency: Math.round(freq * 10) / 10,
    note: noteName,
    octave,
    cents: Math.max(-50, Math.min(50, cents)),
    inTune: Math.abs(cents) <= 3,
  };
}
