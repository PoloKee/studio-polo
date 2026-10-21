/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generate waveform peak data for rendering audio clips in timeline
 */
export function extractWaveformData(buffer: AudioBuffer, numPoints: number = 200): number[] {
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / numPoints);
  const peaks: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const start = i * step;
    let max = 0;
    for (let j = 0; j < step; j++) {
      const val = Math.abs(channelData[start + j] || 0);
      if (val > max) max = val;
    }
    peaks.push(Math.min(1, max));
  }
  return peaks;
}

/**
 * Convert an AudioBuffer to a standard WAV Blob (16, 24, or 32-bit float)
 */
export function audioBufferToWav(
  buffer: AudioBuffer,
  bitDepth: 16 | 24 | 32 = 24
): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = bitDepth === 32 ? 3 : 1; // 3 = IEEE Float, 1 = PCM
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const dataByteLength = numSamples * blockAlign;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM/Float standard header)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Interleave and write audio samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i];
      // Clamp sample between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));

      if (bitDepth === 16) {
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      } else if (bitDepth === 24) {
        const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
        view.setUint8(offset, intSample & 0xff);
        view.setUint8(offset + 1, (intSample >> 8) & 0xff);
        view.setUint8(offset + 2, (intSample >> 16) & 0xff);
        offset += 3;
      } else if (bitDepth === 32) {
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Generate a rich, polished multi-track demo session in-browser
 * Synthesizes 6 distinct studio tracks: Drums, Bass, Synth Lead, Chords, Vocal Lead, and Rhythm Guitar
 */
export async function createDemoTracks(ctx: AudioContext): Promise<{
  drums: AudioBuffer;
  bass: AudioBuffer;
  lead: AudioBuffer;
  chords: AudioBuffer;
  vocal: AudioBuffer;
  guitar: AudioBuffer;
  vocalTakes: { take1: AudioBuffer; take2: AudioBuffer; take3: AudioBuffer };
}> {
  const bpm = 120;
  const totalBars = 8;
  const secondsPerBeat = 60 / bpm;
  const secondsPerBar = secondsPerBeat * 4;
  const totalSeconds = secondsPerBar * totalBars;
  const sampleRate = ctx.sampleRate;
  const totalSamples = Math.floor(sampleRate * totalSeconds);

  // 1. Synthesize Drums (Kick, Snare, HiHats, Clap)
  const drumsBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const drumL = drumsBuffer.getChannelData(0);
  const drumR = drumsBuffer.getChannelData(1);

  // Helper for drum synthesis
  for (let bar = 0; bar < totalBars; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const beatTime = (bar * 4 + beat) * secondsPerBeat;
      const beatSample = Math.floor(beatTime * sampleRate);

      // Kick on beat 0 and 2 (and 2.5 on bars 2, 4, 6)
      const kickBeats = [0, 2];
      if (bar % 2 === 1 && beat === 2) {
        // syncopated extra kick
        const extraKickSample = Math.floor((beatTime + secondsPerBeat * 0.5) * sampleRate);
        renderKick(drumL, drumR, extraKickSample, sampleRate);
      }
      if (kickBeats.includes(beat)) {
        renderKick(drumL, drumR, beatSample, sampleRate);
      }

      // Snare on beat 1 and 3
      if (beat === 1 || beat === 3) {
        renderSnare(drumL, drumR, beatSample, sampleRate);
      }

      // 16th note Hi-Hats
      for (let s16 = 0; s16 < 4; s16++) {
        const hhSample = Math.floor((beatTime + s16 * (secondsPerBeat / 4)) * sampleRate);
        const isOpen = s16 === 2; // open hat on upbeats
        renderHiHat(drumL, drumR, hhSample, sampleRate, isOpen);
      }
    }
  }

  // 2. Synthesize Bass (Warm 80s / Modern Synth Bass, F -> Dm -> Bb -> C progression)
  const bassBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const bassL = bassBuffer.getChannelData(0);
  const bassR = bassBuffer.getChannelData(1);
  const bassRoots = [43.65, 43.65, 36.71, 36.71, 29.14, 29.14, 32.7, 32.7]; // F1, F1, D1, D1, Bb0, Bb0, C1, C1 in Hz

  for (let bar = 0; bar < totalBars; bar++) {
    const rootFreq = bassRoots[bar];
    for (let step = 0; step < 8; step++) {
      const noteTime = (bar * 4 + step * 0.5) * secondsPerBeat;
      const noteSample = Math.floor(noteTime * sampleRate);
      const noteDurSamples = Math.floor((secondsPerBeat * 0.45) * sampleRate);
      renderSynthBassNote(bassL, bassR, noteSample, noteDurSamples, rootFreq, sampleRate);
    }
  }

  // 3. Synthesize Lead Synth (Catchy melodic arpeggiated synth)
  const leadBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const leadL = leadBuffer.getChannelData(0);
  const leadR = leadBuffer.getChannelData(1);
  // Melody pitches (Hz) for synth lead
  const melodyPitches = [
    349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 440.0, 523.25, // F4, A4, C5, A4, G4, F4, A4, C5
    587.33, 523.25, 440.0, 392.0, 349.23, 392.0, 440.0, 523.25, // D5, C5, A4, G4, F4, G4, A4, C5
  ];

  for (let bar = 0; bar < totalBars; bar++) {
    for (let step = 0; step < 8; step++) {
      const noteTime = (bar * 4 + step * 0.5) * secondsPerBeat;
      const noteSample = Math.floor(noteTime * sampleRate);
      const noteDurSamples = Math.floor((secondsPerBeat * 0.4) * sampleRate);
      const pitchIdx = (bar * 2 + (step % 4)) % melodyPitches.length;
      const freq = melodyPitches[pitchIdx];
      renderLeadNote(leadL, leadR, noteSample, noteDurSamples, freq, sampleRate);
    }
  }

  // 4. Synthesize Lush Pad / Chords (Warm stereo analog pad)
  const chordsBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const chordL = chordsBuffer.getChannelData(0);
  const chordR = chordsBuffer.getChannelData(1);
  const chordFreqs = [
    [174.61, 220.0, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
    [174.61, 220.0, 261.63, 329.63],
    [146.83, 174.61, 220.0, 261.63], // Dm7 (D3, F3, A3, C4)
    [146.83, 174.61, 220.0, 261.63],
    [116.54, 146.83, 174.61, 220.0], // Bbmaj7 (Bb2, D3, F3, A3)
    [116.54, 146.83, 174.61, 220.0],
    [130.81, 164.81, 196.0, 246.94], // C7 (C3, E3, G3, B3)
    [130.81, 164.81, 196.0, 246.94],
  ];

  for (let bar = 0; bar < totalBars; bar++) {
    const barStartSample = Math.floor(bar * secondsPerBar * sampleRate);
    const barDurSamples = Math.floor(secondsPerBar * sampleRate);
    renderPadChord(chordL, chordR, barStartSample, barDurSamples, chordFreqs[bar], sampleRate);
  }

  // 5. Synthesize Vocal Lead Hook (Expressive formant vocal melody)
  const vocalBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const vocL = vocalBuffer.getChannelData(0);
  const vocR = vocalBuffer.getChannelData(1);
  renderVocalLine(vocL, vocR, totalBars, secondsPerBar, sampleRate, 1.0);

  // Generate 3 distinct takes for Vocal Comping demonstration!
  const take1Buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const take2Buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const take3Buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  renderVocalLine(take1Buffer.getChannelData(0), take1Buffer.getChannelData(1), totalBars, secondsPerBar, sampleRate, 0.98);
  renderVocalLine(take2Buffer.getChannelData(0), take2Buffer.getChannelData(1), totalBars, secondsPerBar, sampleRate, 1.02);
  renderVocalLine(take3Buffer.getChannelData(0), take3Buffer.getChannelData(1), totalBars, secondsPerBar, sampleRate, 1.0);

  // 6. Synthesize Rhythm Guitar Strum
  const guitarBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const gitL = guitarBuffer.getChannelData(0);
  const gitR = guitarBuffer.getChannelData(1);
  for (let bar = 0; bar < totalBars; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const beatTime = (bar * 4 + beat) * secondsPerBeat;
      const beatSample = Math.floor(beatTime * sampleRate);
      const durSamples = Math.floor(secondsPerBeat * 0.8 * sampleRate);
      renderGuitarStrum(gitL, gitR, beatSample, durSamples, chordFreqs[bar], sampleRate);
    }
  }

  return {
    drums: drumsBuffer,
    bass: bassBuffer,
    lead: leadBuffer,
    chords: chordsBuffer,
    vocal: vocalBuffer,
    guitar: guitarBuffer,
    vocalTakes: {
      take1: take1Buffer,
      take2: take2Buffer,
      take3: take3Buffer,
    },
  };
}

// Internal synthesis algorithms for demo audio
function renderKick(L: Float32Array, R: Float32Array, start: number, sr: number) {
  const dur = Math.floor(sr * 0.35);
  for (let i = 0; i < dur && start + i < L.length; i++) {
    const t = i / sr;
    const freq = 140 * Math.exp(-t * 22) + 45;
    const env = Math.exp(-t * 9);
    const click = i < sr * 0.005 ? (Math.random() * 2 - 1) * 0.3 : 0;
    const sample = (Math.sin(2 * Math.PI * freq * t) + click) * env * 0.75;
    L[start + i] += sample;
    R[start + i] += sample;
  }
}

function renderSnare(L: Float32Array, R: Float32Array, start: number, sr: number) {
  const dur = Math.floor(sr * 0.28);
  for (let i = 0; i < dur && start + i < L.length; i++) {
    const t = i / sr;
    const bodyFreq = 180 * Math.exp(-t * 15) + 120;
    const bodyEnv = Math.exp(-t * 14);
    const noiseEnv = Math.exp(-t * 11);
    const body = Math.sin(2 * Math.PI * bodyFreq * t) * bodyEnv * 0.4;
    const noise = (Math.random() * 2 - 1) * noiseEnv * 0.45;
    const sample = (body + noise) * 0.7;
    L[start + i] += sample * 0.95;
    R[start + i] += sample * 1.05;
  }
}

function renderHiHat(L: Float32Array, R: Float32Array, start: number, sr: number, isOpen: boolean) {
  const dur = Math.floor(sr * (isOpen ? 0.25 : 0.06));
  const decayRate = isOpen ? 12 : 65;
  for (let i = 0; i < dur && start + i < L.length; i++) {
    const t = i / sr;
    const env = Math.exp(-t * decayRate);
    const noise = (Math.random() * 2 - 1) * env * (isOpen ? 0.35 : 0.25);
    L[start + i] += noise * 0.8;
    R[start + i] += noise * 1.2;
  }
}

function renderSynthBassNote(
  L: Float32Array,
  R: Float32Array,
  start: number,
  dur: number,
  freq: number,
  sr: number
) {
  for (let i = 0; i < dur && start + i < L.length; i++) {
    const t = i / sr;
    const attack = Math.min(1, i / (sr * 0.01));
    const decay = Math.exp(-t * 2.5);
    const env = attack * decay;
    // Sawtooth + sub-oscillator sine
    const saw = ((2 * ((t * freq) % 1)) - 1) * 0.4;
    const sub = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.4;
    const sample = (saw + sub) * env * 0.65;
    L[start + i] += sample;
    R[start + i] += sample;
  }
}

function renderLeadNote(
  L: Float32Array,
  R: Float32Array,
  start: number,
  dur: number,
  freq: number,
  sr: number
) {
  for (let i = 0; i < dur && start + i < L.length; i++) {
    const t = i / sr;
    const attack = Math.min(1, i / (sr * 0.02));
    const decay = Math.exp(-t * 2.2);
    const env = attack * decay;
    // Detuned dual pulse/saw
    const osc1 = ((2 * ((t * freq) % 1)) - 1) * 0.25;
    const osc2 = ((2 * ((t * (freq * 1.006)) % 1)) - 1) * 0.25;
    const sample = (osc1 + osc2) * env * 0.5;
    // Stereo ping-pong spread
    L[start + i] += sample * 0.7;
    R[start + i] += sample * 1.1;
  }
}

function renderPadChord(
  L: Float32Array,
  R: Float32Array,
  start: number,
  dur: number,
  freqs: number[],
  sr: number
) {
  for (let i = 0; i < dur && start + i < L.length; i++) {
    const t = i / sr;
    // Gentle slow attack and release
    const attack = Math.min(1, i / (sr * 0.3));
    const release = Math.min(1, (dur - i) / (sr * 0.3));
    const env = attack * release * 0.22;

    let sampleL = 0;
    let sampleR = 0;
    freqs.forEach((f, idx) => {
      const pan = (idx / (freqs.length - 1)) * 2 - 1; // -1 to 1
      const osc = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
      sampleL += osc * (1 - pan * 0.5);
      sampleR += osc * (1 + pan * 0.5);
    });

    L[start + i] += sampleL * env;
    R[start + i] += sampleR * env;
  }
}

function renderVocalLine(
  L: Float32Array,
  R: Float32Array,
  totalBars: number,
  secondsPerBar: number,
  sr: number,
  pitchScale: number
) {
  const melodyPitches = [349.23, 392.0, 440.0, 523.25, 440.0, 392.0];
  for (let bar = 0; bar < totalBars; bar++) {
    // Lead vocal sings 2 phrases per 2 bars
    if (bar % 2 === 0) {
      for (let noteIdx = 0; noteIdx < 4; noteIdx++) {
        const noteStart = (bar * secondsPerBar) + noteIdx * 0.75;
        const startSample = Math.floor(noteStart * sr);
        const durSamples = Math.floor(0.65 * sr);
        const f0 = melodyPitches[(bar + noteIdx) % melodyPitches.length] * pitchScale;

        for (let i = 0; i < durSamples && startSample + i < L.length; i++) {
          const t = i / sr;
          const attack = Math.min(1, i / (sr * 0.05));
          const release = Math.min(1, (durSamples - i) / (sr * 0.08));
          const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * (i > sr * 0.2 ? 6.0 : 1.0);
          const currentFreq = f0 + vibrato;

          // Formant-filtered pulse wave
          const f1 = 800; // formant 1
          const f2 = 1200; // formant 2
          const voice = Math.sin(2 * Math.PI * currentFreq * t) +
            0.5 * Math.sin(2 * Math.PI * f1 * t) * Math.sin(2 * Math.PI * currentFreq * t) +
            0.3 * Math.sin(2 * Math.PI * f2 * t) * Math.sin(2 * Math.PI * currentFreq * t);

          const sample = voice * attack * release * 0.28;
          L[startSample + i] += sample;
          R[startSample + i] += sample;
        }
      }
    }
  }
}

function renderGuitarStrum(
  L: Float32Array,
  R: Float32Array,
  start: number,
  dur: number,
  freqs: number[],
  sr: number
) {
  freqs.forEach((f, stringIdx) => {
    const stringOffset = Math.floor(stringIdx * 0.008 * sr); // strum stagger
    const stringStart = start + stringOffset;
    for (let i = 0; i < dur && stringStart + i < L.length; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 4.5);
      const plucked = Math.sin(2 * Math.PI * (f * 2) * t) * env * 0.15;
      L[stringStart + i] += plucked * (stringIdx % 2 === 0 ? 0.9 : 0.6);
      R[stringStart + i] += plucked * (stringIdx % 2 === 0 ? 0.6 : 0.9);
    }
  });
}
