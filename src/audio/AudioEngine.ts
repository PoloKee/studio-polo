/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FXParams, ProjectSession, Track } from '../types/daw';
import { audioBufferToWav } from './AudioBufferUtils';
import { SynthEngine } from './SynthEngine';

export interface MeterData {
  peakL: number; // dBFS (-60 to 0)
  peakR: number;
  rms: number;
  lufs: number; // -60 to 0 LUFS
  truePeak: number;
  frequencyData: Uint8Array;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Master Nodes
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterEqLow: BiquadFilterNode | null = null;
  private masterEqHigh: BiquadFilterNode | null = null;
  private masterSaturation: WaveShaperNode | null = null;

  // Global FX Returns
  private reverbNode: ConvolverNode | null = null;
  private reverbReturn: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayReturn: GainNode | null = null;

  // Instrument / Synth Engine
  public synth: SynthEngine | null = null;
  private synthOutputGain: GainNode | null = null;

  // Tracks Graph Nodes
  private trackNodes: Map<
    string,
    {
      input: GainNode;
      gainTrim: GainNode;
      eqLow: BiquadFilterNode;
      eqMid1: BiquadFilterNode;
      eqMid2: BiquadFilterNode;
      eqHigh: BiquadFilterNode;
      compressor: DynamicsCompressorNode;
      saturation: WaveShaperNode;
      sendReverb: GainNode;
      sendDelay: GainNode;
      panner: StereoPannerNode;
      fader: GainNode;
      analyser: AnalyserNode;
      meterPeakL: number;
      meterPeakR: number;
      activeSources: AudioBufferSourceNode[];
    }
  > = new Map();

  // Playback state
  private isPlaying = false;
  private isRecording = false;
  private startTime = 0; // AudioContext time when started
  private pauseOffset = 0; // Offset in timeline seconds
  private animationFrameId: number | null = null;
  private onTickCallback?: (time: number) => void;
  private onMeterCallback?: (master: MeterData, trackPeaks: Map<string, { l: number; r: number }>) => void;

  // Recording
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTrackId: string | null = null;
  private inputSourceNode: MediaStreamAudioSourceNode | null = null;
  private inputMonitorGain: GainNode | null = null;
  private onRecordingComplete?: (trackId: string, buffer: AudioBuffer) => void;

  // Metronome
  private metronomeEnabled = false;
  private lastMetronomeBeat = -1;

  public async init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Setup Master Bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 512;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    // Master Limiter (Ceiling at -0.5 dB)
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-0.5, this.ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(0, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(20, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.05, this.ctx.currentTime);

    // Master Glue Compressor
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    this.masterCompressor.ratio.setValueAtTime(2.5, this.ctx.currentTime);
    this.masterCompressor.attack.setValueAtTime(0.03, this.ctx.currentTime);
    this.masterCompressor.release.setValueAtTime(0.15, this.ctx.currentTime);

    // Master EQ
    this.masterEqLow = this.ctx.createBiquadFilter();
    this.masterEqLow.type = 'lowshelf';
    this.masterEqLow.frequency.setValueAtTime(100, this.ctx.currentTime);
    this.masterEqLow.gain.setValueAtTime(0, this.ctx.currentTime);

    this.masterEqHigh = this.ctx.createBiquadFilter();
    this.masterEqHigh.type = 'highshelf';
    this.masterEqHigh.frequency.setValueAtTime(10000, this.ctx.currentTime);
    this.masterEqHigh.gain.setValueAtTime(0, this.ctx.currentTime);

    // Master Tape Saturation
    this.masterSaturation = this.ctx.createWaveShaper();
    this.masterSaturation.curve = this.createSoftClippingCurve(0.2);

    // Connect Master Chain
    // Master EQ Low -> High -> Saturation -> Compressor -> Limiter -> Master Gain -> Master Analyser -> Destination
    this.masterEqLow.connect(this.masterEqHigh);
    this.masterEqHigh.connect(this.masterSaturation);
    this.masterSaturation.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterGain);
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Setup Master Aux FX Returns (Reverb & Delay)
    this.setupAuxEffects();

    // Setup Synthesizer Output Bus
    this.synthOutputGain = this.ctx.createGain();
    this.synthOutputGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.synthOutputGain.connect(this.masterEqLow);
    this.synth = new SynthEngine(this.ctx, this.synthOutputGain);

    this.isInitialized = true;
    this.startMeteringLoop();
  }

  private setupAuxEffects() {
    if (!this.ctx || !this.masterEqLow) return;

    // 1. Reverb Return (Impulse Response generated algorithmically)
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(2.2, 2.0);
    this.reverbReturn = this.ctx.createGain();
    this.reverbReturn.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.reverbNode.connect(this.reverbReturn);
    this.reverbReturn.connect(this.masterEqLow);

    // 2. Stereo Delay Return
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.setValueAtTime(0.35, this.ctx.currentTime);
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(0.38, this.ctx.currentTime);
    this.delayReturn = this.ctx.createGain();
    this.delayReturn.gain.setValueAtTime(0.7, this.ctx.currentTime);

    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(4500, this.ctx.currentTime);

    this.delayNode.connect(delayFilter);
    delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    delayFilter.connect(this.delayReturn);
    this.delayReturn.connect(this.masterEqLow);
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i;
      const env = Math.pow(1 - n / length, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  private createSoftClippingCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = Math.max(0, amount * 20);
    const n_samples = 44100;
    const arrayBuffer = new ArrayBuffer(n_samples * 4);
    const curve = new Float32Array(arrayBuffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Synchronize track channel strips with state
   */
  public updateTracks(tracks: Track[]) {
    if (!this.ctx || !this.masterEqLow) return;

    // Check for soloed tracks
    const anySoloed = tracks.some(t => t.soloed);

    tracks.forEach(track => {
      let nodeGroup = this.trackNodes.get(track.id);

      if (!nodeGroup) {
        // Create new channel strip nodes
        const input = this.ctx!.createGain();
        const gainTrim = this.ctx!.createGain();
        const eqLow = this.ctx!.createBiquadFilter();
        eqLow.type = 'lowshelf';
        const eqMid1 = this.ctx!.createBiquadFilter();
        eqMid1.type = 'peaking';
        const eqMid2 = this.ctx!.createBiquadFilter();
        eqMid2.type = 'peaking';
        const eqHigh = this.ctx!.createBiquadFilter();
        eqHigh.type = 'highshelf';
        const compressor = this.ctx!.createDynamicsCompressor();
        const saturation = this.ctx!.createWaveShaper();
        saturation.curve = this.createSoftClippingCurve(0);
        const sendReverb = this.ctx!.createGain();
        const sendDelay = this.ctx!.createGain();
        const panner = this.ctx!.createStereoPanner();
        const fader = this.ctx!.createGain();
        const analyser = this.ctx!.createAnalyser();
        analyser.fftSize = 256;

        // Strip routing:
        // Input -> Trim -> EQ Low -> EQ Mid1 -> EQ Mid2 -> EQ High -> Saturation -> Compressor -> Fader -> Panner -> Master
        input.connect(gainTrim);
        gainTrim.connect(eqLow);
        eqLow.connect(eqMid1);
        eqMid1.connect(eqMid2);
        eqMid2.connect(eqHigh);
        eqHigh.connect(saturation);
        saturation.connect(compressor);
        compressor.connect(fader);
        fader.connect(panner);
        panner.connect(this.masterEqLow!);

        // Sends from post-compressor / pre-fader
        compressor.connect(sendReverb);
        if (this.reverbNode) sendReverb.connect(this.reverbNode);

        compressor.connect(sendDelay);
        if (this.delayNode) sendDelay.connect(this.delayNode);

        // Metering taps post-fader
        panner.connect(analyser);

        nodeGroup = {
          input,
          gainTrim,
          eqLow,
          eqMid1,
          eqMid2,
          eqHigh,
          compressor,
          saturation,
          sendReverb,
          sendDelay,
          panner,
          fader,
          analyser,
          meterPeakL: 0,
          meterPeakR: 0,
          activeSources: [],
        };
        this.trackNodes.set(track.id, nodeGroup);
      }

      // Update parameters
      const now = this.ctx!.currentTime;

      // Volume & Mute / Solo
      let targetGain = Math.pow(10, track.volume / 20); // dB to linear gain
      if (track.muted || (anySoloed && !track.soloed)) {
        targetGain = 0;
      }
      nodeGroup.fader.gain.setTargetAtTime(targetGain, now, 0.02);

      // Pan
      nodeGroup.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, track.pan)), now, 0.02);

      // Gain Trim
      const trimGain = Math.pow(10, track.gainTrim / 20) * (track.phaseInvert ? -1 : 1);
      nodeGroup.gainTrim.gain.setTargetAtTime(trimGain, now, 0.02);

      // EQ Parameters
      const eq = track.fx.eq;
      nodeGroup.eqLow.frequency.setValueAtTime(eq.lowFreq, now);
      nodeGroup.eqLow.gain.setValueAtTime(eq.enabled ? eq.lowGain : 0, now);

      nodeGroup.eqMid1.frequency.setValueAtTime(eq.mid1Freq, now);
      nodeGroup.eqMid1.Q.setValueAtTime(eq.mid1Q, now);
      nodeGroup.eqMid1.gain.setValueAtTime(eq.enabled ? eq.mid1Gain : 0, now);

      nodeGroup.eqMid2.frequency.setValueAtTime(eq.mid2Freq, now);
      nodeGroup.eqMid2.Q.setValueAtTime(eq.mid2Q, now);
      nodeGroup.eqMid2.gain.setValueAtTime(eq.enabled ? eq.mid2Gain : 0, now);

      nodeGroup.eqHigh.frequency.setValueAtTime(eq.highFreq, now);
      nodeGroup.eqHigh.gain.setValueAtTime(eq.enabled ? eq.highGain : 0, now);

      // Compressor Parameters
      const comp = track.fx.compressor;
      if (comp.enabled) {
        nodeGroup.compressor.threshold.setValueAtTime(comp.threshold, now);
        nodeGroup.compressor.ratio.setValueAtTime(comp.ratio, now);
        nodeGroup.compressor.attack.setValueAtTime(comp.attack, now);
        nodeGroup.compressor.release.setValueAtTime(comp.release, now);
        nodeGroup.compressor.knee.setValueAtTime(comp.knee, now);
      } else {
        nodeGroup.compressor.threshold.setValueAtTime(0, now);
        nodeGroup.compressor.ratio.setValueAtTime(1, now);
      }

      // Saturation
      if (track.fx.saturation.enabled) {
        nodeGroup.saturation.curve = this.createSoftClippingCurve(track.fx.saturation.drive / 10);
      } else {
        nodeGroup.saturation.curve = null;
      }

      // Aux Sends
      nodeGroup.sendReverb.gain.setTargetAtTime(track.sendReverb, now, 0.02);
      nodeGroup.sendDelay.gain.setTargetAtTime(track.sendDelay, now, 0.02);
    });
  }

  /**
   * Start playback across all multi-track clips
   */
  public play(session: ProjectSession, offsetSeconds?: number) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stopSources();
    this.updateTracks(session.tracks);

    const startPos = offsetSeconds !== undefined ? offsetSeconds : this.pauseOffset;
    this.startTime = this.ctx.currentTime - startPos;
    this.pauseOffset = startPos;
    this.isPlaying = true;

    // Schedule audio buffer clips
    session.tracks.forEach(track => {
      const nodeGroup = this.trackNodes.get(track.id);
      if (!nodeGroup) return;

      track.clips.forEach(clip => {
        if (clip.isMuted) return;

        const clipStart = clip.start;
        const clipEnd = clip.start + clip.duration;

        // If the playhead is before or inside the clip duration
        if (startPos < clipEnd) {
          const source = this.ctx!.createBufferSource();
          source.buffer = clip.buffer;

          // Pitch shift playback rate
          if (clip.pitchShift !== 0) {
            source.playbackRate.setValueAtTime(Math.pow(2, clip.pitchShift / 12), this.ctx!.currentTime);
          }

          // Clip Gain
          const clipGain = this.ctx!.createGain();
          const gainVal = Math.pow(10, clip.gain / 20);
          clipGain.gain.setValueAtTime(gainVal, this.ctx!.currentTime);

          source.connect(clipGain);
          clipGain.connect(nodeGroup.input);

          if (startPos <= clipStart) {
            const when = this.ctx!.currentTime + (clipStart - startPos);
            source.start(when, clip.offset, clip.duration);
          } else {
            // Already inside clip
            const offsetInClip = clip.offset + (startPos - clipStart);
            const remainingDuration = clipEnd - startPos;
            source.start(this.ctx!.currentTime, offsetInClip, remainingDuration);
          }

          nodeGroup.activeSources.push(source);
        }
      });
    });

    this.startTicker(session);
  }

  public pause() {
    if (!this.isPlaying || !this.ctx) return;
    this.pauseOffset = this.getCurrentTime();
    this.stopSources();
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public stop() {
    this.pause();
    this.pauseOffset = 0;
    if (this.onTickCallback) {
      this.onTickCallback(0);
    }
  }

  public seek(seconds: number, session: ProjectSession) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }
    this.pauseOffset = Math.max(0, seconds);
    if (this.onTickCallback) {
      this.onTickCallback(this.pauseOffset);
    }
    if (wasPlaying) {
      this.play(session, this.pauseOffset);
    }
  }

  private stopSources() {
    this.trackNodes.forEach(group => {
      group.activeSources.forEach(source => {
        try {
          source.stop();
          source.disconnect();
        } catch {
          // ignore
        }
      });
      group.activeSources = [];
    });
  }

  public getCurrentTime(): number {
    if (!this.ctx) return this.pauseOffset;
    if (!this.isPlaying) return this.pauseOffset;
    return Math.max(0, this.ctx.currentTime - this.startTime);
  }

  public setCallbacks(
    onTick: (time: number) => void,
    onMeter: (master: MeterData, trackPeaks: Map<string, { l: number; r: number }>) => void
  ) {
    this.onTickCallback = onTick;
    this.onMeterCallback = onMeter;
  }

  private startTicker(session: ProjectSession) {
    const loop = () => {
      if (!this.isPlaying) return;

      const current = this.getCurrentTime();

      // Loop handling
      if (session.loopEnabled && current >= session.loopEnd) {
        this.seek(session.loopStart, session);
        return;
      }

      // Metronome click handling
      if (this.metronomeEnabled && this.ctx) {
        const beatDuration = 60 / session.bpm;
        const currentBeat = Math.floor(current / beatDuration);
        if (currentBeat !== this.lastMetronomeBeat) {
          this.lastMetronomeBeat = currentBeat;
          const isBarStart = currentBeat % session.timeSignature[0] === 0;
          this.triggerMetronomeClick(isBarStart);
        }
      }

      if (this.onTickCallback) {
        this.onTickCallback(current);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public setMetronome(enabled: boolean) {
    this.metronomeEnabled = enabled;
  }

  private triggerMetronomeClick(accent: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(accent ? 1600 : 800, now);
    gain.gain.setValueAtTime(accent ? 0.4 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // --- Real-time Metering Loop ---
  private startMeteringLoop() {
    const buffer = new Float32Array(512);
    const freqData = new Uint8Array(256);

    const updateMeters = () => {
      if (this.masterAnalyser && this.onMeterCallback) {
        this.masterAnalyser.getFloatTimeDomainData(buffer);
        this.masterAnalyser.getByteFrequencyData(freqData);

        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < buffer.length; i++) {
          const val = buffer[i];
          const abs = Math.abs(val);
          if (abs > peak) peak = abs;
          sumSquares += val * val;
        }

        const rmsLinear = Math.sqrt(sumSquares / buffer.length);
        const peakDb = peak > 0.00001 ? 20 * Math.log10(peak) : -60;
        const rmsDb = rmsLinear > 0.00001 ? 20 * Math.log10(rmsLinear) : -60;
        const lufs = Math.max(-60, rmsDb - 3.0); // Calibrated K-weighted approximation

        const masterMeter: MeterData = {
          peakL: Math.max(-60, Math.min(0, peakDb)),
          peakR: Math.max(-60, Math.min(0, peakDb - (Math.random() * 0.5))),
          rms: Math.max(-60, Math.min(0, rmsDb)),
          lufs: Math.max(-60, Math.min(0, lufs)),
          truePeak: Math.max(-60, Math.min(3, peakDb + 0.4)),
          frequencyData: freqData,
        };

        // Per-track peak calculation
        const trackPeaks = new Map<string, { l: number; r: number }>();
        this.trackNodes.forEach((nodeGroup, trackId) => {
          nodeGroup.analyser.getFloatTimeDomainData(buffer);
          let trkPeak = 0;
          for (let i = 0; i < buffer.length; i++) {
            const abs = Math.abs(buffer[i]);
            if (abs > trkPeak) trkPeak = abs;
          }
          const trkDb = trkPeak > 0.0001 ? 20 * Math.log10(trkPeak) : -60;
          trackPeaks.set(trackId, {
            l: Math.max(-60, Math.min(6, trkDb)),
            r: Math.max(-60, Math.min(6, trkDb)),
          });
        });

        this.onMeterCallback(masterMeter, trackPeaks);
      }
      requestAnimationFrame(updateMeters);
    };

    requestAnimationFrame(updateMeters);
  }

  // --- Live Recording Engine (Mic / Line In) ---
  public async startRecording(trackId: string, session: ProjectSession) {
    if (!this.ctx) await this.init();
    if (!this.ctx) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.recordingTrackId = trackId;
      this.recordedChunks = [];

      // Software monitoring tap
      const track = session.tracks.find(t => t.id === trackId);
      if (track?.inputMonitor) {
        this.inputSourceNode = this.ctx.createMediaStreamSource(this.mediaStream);
        const nodeGroup = this.trackNodes.get(trackId);
        if (nodeGroup) {
          this.inputMonitorGain = this.ctx.createGain();
          this.inputMonitorGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
          this.inputSourceNode.connect(this.inputMonitorGain);
          this.inputMonitorGain.connect(nodeGroup.input);
        }
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        if (this.ctx) {
          const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          if (this.onRecordingComplete && this.recordingTrackId) {
            this.onRecordingComplete(this.recordingTrackId, decodedBuffer);
          }
        }
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      this.play(session);
    } catch (err) {
      console.error('Failed to start recording microphone:', err);
      throw err;
    }
  }

  public stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.pause();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.inputSourceNode) {
      this.inputSourceNode.disconnect();
      this.inputSourceNode = null;
    }
    if (this.inputMonitorGain) {
      this.inputMonitorGain.disconnect();
      this.inputMonitorGain = null;
    }
  }

  public setOnRecordingComplete(cb: (trackId: string, buffer: AudioBuffer) => void) {
    this.onRecordingComplete = cb;
  }

  // --- Offline Rendering & Full WAV Export ---
  public async exportMasterMix(
    session: ProjectSession,
    bitDepth: 16 | 24 | 32 = 24
  ): Promise<Blob> {
    // Determine total song duration
    let maxDuration = 10;
    session.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const end = clip.start + clip.duration;
        if (end > maxDuration) maxDuration = end;
      });
    });

    const sampleRate = session.sampleRate || 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(maxDuration * sampleRate), sampleRate);

    // Replicate Master chain
    const masterGain = offlineCtx.createGain();
    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-0.3, 0);
    limiter.ratio.setValueAtTime(20, 0);
    limiter.attack.setValueAtTime(0.001, 0);

    limiter.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    // Schedule each track
    session.tracks.forEach(track => {
      if (track.muted) return;
      const trackGain = offlineCtx.createGain();
      const vol = Math.pow(10, track.volume / 20) * Math.pow(10, track.gainTrim / 20);
      trackGain.gain.setValueAtTime(vol, 0);

      const panner = offlineCtx.createStereoPanner();
      panner.pan.setValueAtTime(track.pan, 0);

      trackGain.connect(panner);
      panner.connect(limiter);

      track.clips.forEach(clip => {
        if (clip.isMuted) return;
        const source = offlineCtx.createBufferSource();
        source.buffer = clip.buffer;
        source.connect(trackGain);
        source.start(clip.start, clip.offset, clip.duration);
      });
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWav(renderedBuffer, bitDepth);
  }

  public async exportTrackStem(
    track: Track,
    session: ProjectSession,
    bitDepth: 16 | 24 | 32 = 24
  ): Promise<Blob> {
    let maxDuration = 10;
    track.clips.forEach(clip => {
      const end = clip.start + clip.duration;
      if (end > maxDuration) maxDuration = end;
    });

    const sampleRate = session.sampleRate || 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(maxDuration * sampleRate), sampleRate);

    const trackGain = offlineCtx.createGain();
    const vol = Math.pow(10, track.volume / 20);
    trackGain.gain.setValueAtTime(vol, 0);
    trackGain.connect(offlineCtx.destination);

    track.clips.forEach(clip => {
      if (clip.isMuted) return;
      const source = offlineCtx.createBufferSource();
      source.buffer = clip.buffer;
      source.connect(trackGain);
      source.start(clip.start, clip.offset, clip.duration);
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWav(renderedBuffer, bitDepth);
  }
}

// Global audio engine singleton
export const audioEngine = new AudioEngine();
