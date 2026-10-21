/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TrackType = 'audio' | 'instrument' | 'bus' | 'aux' | 'vca' | 'master';

export interface FXParams {
  eq: {
    enabled: boolean;
    lowGain: number; // dB (-12 to +12)
    lowFreq: number; // Hz (80)
    mid1Gain: number; // dB
    mid1Freq: number; // Hz (500)
    mid1Q: number;
    mid2Gain: number; // dB
    mid2Freq: number; // Hz (2500)
    mid2Q: number;
    highGain: number; // dB
    highFreq: number; // Hz (10000)
  };
  compressor: {
    enabled: boolean;
    threshold: number; // dB (-60 to 0)
    ratio: number; // 1 to 20
    attack: number; // s (0.001 to 0.1)
    release: number; // s (0.05 to 1.0)
    knee: number; // dB (0 to 40)
    makeup: number; // dB (0 to 24)
  };
  reverb: {
    enabled: boolean;
    decay: number; // s (0.5 to 10)
    preDelay: number; // s (0 to 0.1)
    wet: number; // 0 to 1
  };
  delay: {
    enabled: boolean;
    time: number; // s (0.05 to 1.0)
    feedback: number; // 0 to 0.9
    wet: number; // 0 to 1
  };
  saturation: {
    enabled: boolean;
    drive: number; // 0 to 10
    tone: number; // -1 to 1
  };
  chorus: {
    enabled: boolean;
    rate: number; // Hz (0.1 to 5)
    depth: number; // (0 to 1)
    mix: number; // 0 to 1
  };
  amp: {
    enabled: boolean;
    model: 'clean' | 'crunch' | 'lead' | 'bass';
    gain: number;
    bass: number;
    mid: number;
    treble: number;
    presence: number;
  };
  pitchCorrection: {
    enabled: boolean;
    scale: 'chromatic' | 'major' | 'minor' | 'pentatonic';
    rootKey: string;
    speed: number; // 0 (natural) to 100 (hard tune)
  };
}

export interface AudioClip {
  id: string;
  trackId: string;
  name: string;
  start: number; // in seconds on timeline
  duration: number; // in seconds
  offset: number; // offset into source buffer
  buffer: AudioBuffer;
  waveformData?: number[]; // pre-computed peaks [-1, 1]
  gain: number; // dB (-24 to +12)
  fadeIn: number; // in seconds
  fadeOut: number; // in seconds
  pitchShift: number; // semitones (-12 to +12)
  isMuted: boolean;
}

export interface MidiNote {
  id: string;
  pitch: number; // 0-127 (e.g. 60 = Middle C)
  start: number; // in bars or beats
  duration: number; // in beats
  velocity: number; // 0-127
}

export interface MidiClip {
  id: string;
  trackId: string;
  name: string;
  start: number; // in beats
  duration: number; // in beats
  notes: MidiNote[];
}

export interface VocalTake {
  id: string;
  takeIndex: number;
  name: string;
  buffer: AudioBuffer;
  waveformData: number[];
  duration: number;
  isComped: boolean;
  compRegions: { start: number; end: number }[]; // start/end in seconds
}

export interface SpatialParams {
  x: number; // -100 to 100 (Left to Right)
  y: number; // -100 to 100 (Front to Back)
  z: number; // 0 to 100 (Floor to Ceiling / Height)
  size: number; // Object size / diffusion (0 to 100)
  spread: number; // Stereo spread (0 to 100)
  binaural: boolean; // HRTF headphone mode
  channelFormat: '7.1.4' | '5.1' | 'Binaural' | 'Stereo';
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  icon: string;
  volume: number; // dB (-60 to +6, where 0 is unity)
  pan: number; // -1.0 (L) to +1.0 (R)
  muted: boolean;
  soloed: boolean;
  armed: boolean;
  phaseInvert: boolean;
  inputMonitor: boolean;
  gainTrim: number; // dB (-18 to +18)
  sendReverb: number; // 0 to 1
  sendDelay: number; // 0 to 1
  fx: FXParams;
  spatial: SpatialParams;
  clips: AudioClip[];
  midiClips: MidiClip[];
  takes: VocalTake[];
  vcaGroupId?: string;
  meterPeakL: number; // 0 to 1
  meterPeakR: number; // 0 to 1
  gainReduction: number; // dB
}

export interface AlbumSong {
  id: string;
  trackNumber: number;
  title: string;
  artist: string;
  duration: string;
  isrc: string;
  gapSeconds: number;
  loudnessLUFS: number;
  peakDb: number;
  status: 'Mixed' | 'Mastered' | 'Ready';
}

export interface Marker {
  id: string;
  name: string;
  time: number; // seconds
  color: string;
  notes?: string;
  lyrics?: string;
  chords?: string;
}

export interface ClipLauncherScene {
  id: string;
  name: string;
  bpm: number;
  active: boolean;
  trackSlots: Record<string, {
    clipName: string;
    hasAudio: boolean;
    isPlaying: boolean;
    color: string;
  }>;
}

export interface ProjectSession {
  id: string;
  name: string;
  artist: string;
  album: string;
  bpm: number;
  timeSignature: [number, number]; // e.g. [4, 4]
  sampleRate: number; // 44100, 48000, 96000
  bitDepth: 16 | 24 | 32;
  snapGrid: '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32' | 'off';
  loopEnabled: boolean;
  loopStart: number; // seconds
  loopEnd: number; // seconds
  punchInEnabled: boolean;
  punchInStart: number;
  punchInEnd: number;
  preRollBars: 0 | 1 | 2;
  countInEnabled: boolean;
  tracks: Track[];
  markers: Marker[];
  albumSongs: AlbumSong[];
  scenes: ClipLauncherScene[];
}

export type DAWView = 
  | 'timeline' 
  | 'mixer' 
  | 'pianoroll' 
  | 'drums' 
  | 'fxrack' 
  | 'mastering' 
  | 'spatial' 
  | 'cliplauncher' 
  | 'aisuite' 
  | 'nodegraph';
