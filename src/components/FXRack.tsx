/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Sliders, 
  Volume2, 
  Mic, 
  Disc, 
  Sparkles, 
  Zap, 
  Radio, 
  Flame,
  Music,
  CheckCircle2
} from 'lucide-react';
import { FXParams, ProjectSession, Track } from '../types/daw';
import { audioEngine } from '../audio/AudioEngine';
import { detectPitch, TunerResult } from '../audio/Tuner';

interface FXRackProps {
  session: ProjectSession;
  selectedTrackId: string;
  onSelectTrack: (trackId: string) => void;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
}

export const FXRack: React.FC<FXRackProps> = ({
  session,
  selectedTrackId,
  onSelectTrack,
  onUpdateSession,
}) => {
  const currentTrack = session.tracks.find(t => t.id === selectedTrackId) || session.tracks[0];
  const [activeTab, setActiveTab] = useState<'eq' | 'comp' | 'reverb' | 'delay' | 'sat' | 'amp' | 'pitch' | 'tuner'>('eq');

  // Chromatic Tuner live state
  const [isTunerActive, setIsTunerActive] = useState<boolean>(false);
  const [tunerData, setTunerData] = useState<TunerResult | null>(null);
  const tunerStreamRef = useRef<MediaStream | null>(null);
  const tunerAudioContextRef = useRef<AudioContext | null>(null);

  // Start / Stop Live Tuner
  useEffect(() => {
    let animationId: number;

    const startTuner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tunerStreamRef.current = stream;
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        tunerAudioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        const buffer = new Float32Array(2048);

        const checkPitch = () => {
          analyser.getFloatTimeDomainData(buffer);
          const result = detectPitch(buffer, ctx.sampleRate);
          setTunerData(result);
          animationId = requestAnimationFrame(checkPitch);
        };
        animationId = requestAnimationFrame(checkPitch);
      } catch (err) {
        console.warn('Microphone access for chromatic tuner unavailable:', err);
      }
    };

    if (activeTab === 'tuner' && isTunerActive) {
      startTuner();
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (tunerStreamRef.current) {
        tunerStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (tunerAudioContextRef.current) {
        tunerAudioContextRef.current.close();
      }
    };
  }, [activeTab, isTunerActive]);

  const updateFX = (updater: (prevFX: FXParams) => FXParams) => {
    onUpdateSession(prev => ({
      ...prev,
      tracks: prev.tracks.map(t =>
        t.id === currentTrack.id ? { ...t, fx: updater(t.fx) } : t
      ),
    }));
  };

  const fx = currentTrack.fx;

  return (
    <div className="flex-1 flex flex-col bg-[#121317] overflow-hidden select-none">
      {/* Rack Subheader & Track Selector */}
      <div className="h-12 border-b border-[#22242c] bg-[#16171d] px-6 flex items-center justify-between text-xs">
        {/* Track Selector */}
        <div className="flex items-center gap-3">
          <span className="text-neutral-400 font-semibold uppercase text-[11px]">Selected Channel:</span>
          <select
            value={currentTrack.id}
            onChange={(e) => onSelectTrack(e.target.value)}
            className="bg-[#20222a] border border-[#2b2d39] text-white px-3 py-1.5 rounded font-semibold text-xs focus:outline-none cursor-pointer"
          >
            {session.tracks.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Plugin Tabs */}
        <div className="flex items-center gap-1 bg-[#101115] p-1 rounded-lg border border-[#242633]">
          <button
            onClick={() => setActiveTab('eq')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'eq' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            4-Band EQ
          </button>
          <button
            onClick={() => setActiveTab('comp')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'comp' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Compressor
          </button>
          <button
            onClick={() => setActiveTab('reverb')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'reverb' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Studio Reverb
          </button>
          <button
            onClick={() => setActiveTab('delay')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'delay' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Stereo Delay
          </button>
          <button
            onClick={() => setActiveTab('sat')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'sat' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Tape Saturation
          </button>
          <button
            onClick={() => setActiveTab('amp')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'amp' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Amp Sim
          </button>
          <button
            onClick={() => setActiveTab('pitch')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'pitch' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Pitch Correction
          </button>
          <button
            onClick={() => setActiveTab('tuner')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'tuner' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Chromatic Tuner
          </button>
        </div>
      </div>

      {/* Main Plugin Chassis Viewport */}
      <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
        {/* 1. 4-BAND PARAMETRIC EQ */}
        {activeTab === 'eq' && (
          <div className="w-full max-w-4xl bg-[#171822] border border-[#2b2d3d] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#252735] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-wide">PRECISION 4-BAND PARAMETRIC EQ</span>
                <span className="text-neutral-500 font-mono text-xs">/ Linear Phase Mode</span>
              </div>
              <button
                onClick={() => updateFX(p => ({ ...p, eq: { ...p.eq, enabled: !p.eq.enabled } }))}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  fx.eq.enabled ? 'bg-blue-600 text-white' : 'bg-[#252734] text-neutral-400'
                }`}
              >
                {fx.eq.enabled ? 'EQ ACTIVE' : 'BYPASSED'}
              </button>
            </div>

            {/* EQ Frequency Visual Curve Display */}
            <div className="h-44 bg-[#0e0f14] rounded-xl border border-[#232532] p-4 relative overflow-hidden flex items-center justify-center">
              {/* Frequency Grid Lines */}
              <div className="absolute inset-0 flex justify-between px-6 pointer-events-none opacity-20">
                <span className="text-[10px] text-neutral-500 font-mono self-end">100Hz</span>
                <span className="text-[10px] text-neutral-500 font-mono self-end">500Hz</span>
                <span className="text-[10px] text-neutral-500 font-mono self-end">2kHz</span>
                <span className="text-[10px] text-neutral-500 font-mono self-end">10kHz</span>
              </div>

              {/* Parametric Curve SVG */}
              <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                {/* 0dB reference line */}
                <line x1="0" y1="100" x2="800" y2="100" stroke="#333748" strokeDasharray="4 4" strokeWidth="1" />

                {/* Simulated Parametric EQ Curve */}
                <path
                  d={`M 0,${100 - fx.eq.lowGain * 5} 
                     C 150,${100 - fx.eq.lowGain * 5} 250,${100 - fx.eq.mid1Gain * 6} 350,${100 - fx.eq.mid1Gain * 6}
                     C 450,${100 - fx.eq.mid1Gain * 6} 550,${100 - fx.eq.mid2Gain * 6} 650,${100 - fx.eq.highGain * 5}
                     L 800,${100 - fx.eq.highGain * 5}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                />
              </svg>
            </div>

            {/* EQ Control Knobs */}
            <div className="grid grid-cols-4 gap-6">
              {/* Band 1: Low Shelf */}
              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-neutral-300">LOW SHELF</span>
                <span className="font-mono text-xs text-blue-400 font-semibold">{fx.eq.lowFreq} Hz</span>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[10px] text-neutral-500">Gain ({fx.eq.lowGain > 0 ? `+${fx.eq.lowGain}` : fx.eq.lowGain} dB)</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={fx.eq.lowGain}
                    onChange={(e) => updateFX(p => ({ ...p, eq: { ...p.eq, lowGain: Number(e.target.value) } }))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Band 2: Mid 1 Peaking */}
              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-neutral-300">MID BELL 1</span>
                <span className="font-mono text-xs text-blue-400 font-semibold">{fx.eq.mid1Freq} Hz</span>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[10px] text-neutral-500">Gain ({fx.eq.mid1Gain > 0 ? `+${fx.eq.mid1Gain}` : fx.eq.mid1Gain} dB)</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={fx.eq.mid1Gain}
                    onChange={(e) => updateFX(p => ({ ...p, eq: { ...p.eq, mid1Gain: Number(e.target.value) } }))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Band 3: Mid 2 Peaking */}
              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-neutral-300">MID BELL 2</span>
                <span className="font-mono text-xs text-blue-400 font-semibold">{fx.eq.mid2Freq} Hz</span>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[10px] text-neutral-500">Gain ({fx.eq.mid2Gain > 0 ? `+${fx.eq.mid2Gain}` : fx.eq.mid2Gain} dB)</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={fx.eq.mid2Gain}
                    onChange={(e) => updateFX(p => ({ ...p, eq: { ...p.eq, mid2Gain: Number(e.target.value) } }))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Band 4: High Shelf */}
              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-neutral-300">HIGH SHELF</span>
                <span className="font-mono text-xs text-blue-400 font-semibold">{fx.eq.highFreq} Hz</span>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[10px] text-neutral-500">Gain ({fx.eq.highGain > 0 ? `+${fx.eq.highGain}` : fx.eq.highGain} dB)</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={fx.eq.highGain}
                    onChange={(e) => updateFX(p => ({ ...p, eq: { ...p.eq, highGain: Number(e.target.value) } }))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. STUDIO COMPRESSOR */}
        {activeTab === 'comp' && (
          <div className="w-full max-w-3xl bg-[#171822] border border-[#2b2d3d] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#252735] pb-3">
              <span className="font-bold text-sm text-white tracking-wide">STUDIO VCA DYNAMICS COMPRESSOR</span>
              <button
                onClick={() => updateFX(p => ({ ...p, compressor: { ...p.compressor, enabled: !p.compressor.enabled } }))}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  fx.compressor.enabled ? 'bg-emerald-600 text-white' : 'bg-[#252734] text-neutral-400'
                }`}
              >
                {fx.compressor.enabled ? 'ACTIVE' : 'BYPASSED'}
              </button>
            </div>

            {/* Gain Reduction Meter Display */}
            <div className="bg-[#0e0f14] p-4 rounded-xl border border-[#232532] flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-400">GAIN REDUCTION (GR):</span>
              <div className="flex-1 max-w-md h-5 bg-[#1b1c24] rounded overflow-hidden mx-4 flex flex-row-reverse">
                <div
                  className="h-full bg-rose-500 transition-all duration-75"
                  style={{ width: `${Math.min(100, (Math.abs(fx.compressor.threshold) / 40) * 60)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-rose-400 font-bold">-4.5 dB</span>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Threshold</span>
                  <span className="font-mono text-white font-bold">{fx.compressor.threshold} dB</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="0"
                  value={fx.compressor.threshold}
                  onChange={(e) => updateFX(p => ({ ...p, compressor: { ...p.compressor, threshold: Number(e.target.value) } }))}
                  className="accent-emerald-500"
                />
              </div>

              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Ratio</span>
                  <span className="font-mono text-white font-bold">{fx.compressor.ratio}:1</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={fx.compressor.ratio}
                  onChange={(e) => updateFX(p => ({ ...p, compressor: { ...p.compressor, ratio: Number(e.target.value) } }))}
                  className="accent-emerald-500"
                />
              </div>

              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Makeup Gain</span>
                  <span className="font-mono text-white font-bold">+{fx.compressor.makeup} dB</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="18"
                  step="0.5"
                  value={fx.compressor.makeup}
                  onChange={(e) => updateFX(p => ({ ...p, compressor: { ...p.compressor, makeup: Number(e.target.value) } }))}
                  className="accent-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. CHROMATIC INSTRUMENT TUNER */}
        {activeTab === 'tuner' && (
          <div className="w-full max-w-2xl bg-[#171822] border border-[#2b2d3d] rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">
            <div className="w-full flex items-center justify-between border-b border-[#252735] pb-3">
              <span className="font-bold text-sm text-white tracking-wide">PRECISION CHROMATIC INSTRUMENT TUNER</span>
              <button
                onClick={() => setIsTunerActive(!isTunerActive)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  isTunerActive ? 'bg-emerald-600 text-white' : 'bg-[#252734] text-neutral-400'
                }`}
              >
                {isTunerActive ? 'MIC LISTENING' : 'START TUNER'}
              </button>
            </div>

            {/* Note Readout */}
            <div className="flex flex-col items-center justify-center p-6">
              <span className="font-mono text-7xl font-extrabold tracking-tighter text-white">
                {tunerData ? `${tunerData.note}${tunerData.octave}` : '--'}
              </span>
              <span className="font-mono text-sm text-neutral-400 mt-2">
                {tunerData ? `${tunerData.frequency} Hz` : 'Play a string or sing...'}
              </span>
            </div>

            {/* Cents Needle Display (-50 to +50 cents) */}
            <div className="w-full max-w-md flex flex-col gap-2">
              <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                <span>-50 Cents (Flat)</span>
                <span className="text-emerald-400 font-bold">IN TUNE</span>
                <span>+50 Cents (Sharp)</span>
              </div>
              <div className="h-6 bg-[#0e0f14] rounded-full border border-[#262835] relative flex items-center px-1 overflow-hidden">
                {/* Center marker */}
                <div className="absolute left-1/2 -top-1 bottom-0 w-1 bg-emerald-500 -ml-0.5 z-10" />
                {/* Needle */}
                {tunerData && (
                  <div
                    className={`absolute top-1 bottom-1 w-2 rounded-full transition-all duration-100 ${
                      tunerData.inTune ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'bg-rose-500'
                    }`}
                    style={{
                      left: `calc(50% + ${(tunerData.cents / 50) * 45}%)`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Standard Tuning Helpers for Guitar / Bass */}
            <div className="flex items-center gap-3 text-xs text-neutral-400 border-t border-[#252735] pt-4 w-full justify-center">
              <span className="font-bold text-neutral-300">Standard Guitar:</span>
              <span className="font-mono px-2 py-0.5 bg-[#20222a] rounded">E2</span>
              <span className="font-mono px-2 py-0.5 bg-[#20222a] rounded">A2</span>
              <span className="font-mono px-2 py-0.5 bg-[#20222a] rounded">D3</span>
              <span className="font-mono px-2 py-0.5 bg-[#20222a] rounded">G3</span>
              <span className="font-mono px-2 py-0.5 bg-[#20222a] rounded">B3</span>
              <span className="font-mono px-2 py-0.5 bg-[#20222a] rounded">E4</span>
            </div>
          </div>
        )}

        {/* 4. GUITAR AMP SIMULATOR */}
        {activeTab === 'amp' && (
          <div className="w-full max-w-3xl bg-[#171822] border border-[#2b2d3d] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#252735] pb-3">
              <span className="font-bold text-sm text-white tracking-wide">VINTAGE TUBE AMP & CAB SIMULATOR</span>
              <button
                onClick={() => updateFX(p => ({ ...p, amp: { ...p.amp, enabled: !p.amp.enabled } }))}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  fx.amp.enabled ? 'bg-amber-600 text-white' : 'bg-[#252734] text-neutral-400'
                }`}
              >
                {fx.amp.enabled ? 'AMP ACTIVE' : 'BYPASSED'}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#121319] p-3 rounded-xl border border-[#242634] flex flex-col gap-1">
                <span className="text-[11px] text-neutral-400">Model</span>
                <select
                  value={fx.amp.model}
                  onChange={(e) => updateFX(p => ({ ...p, amp: { ...p.amp, model: e.target.value as any } }))}
                  className="bg-[#20222a] text-white p-1 rounded font-semibold text-xs"
                >
                  <option value="clean">65 Clean Reverb</option>
                  <option value="crunch">British Crunch</option>
                  <option value="lead">High-Gain Lead</option>
                  <option value="bass">Bass 300 Tube</option>
                </select>
              </div>

              <div className="bg-[#121319] p-3 rounded-xl border border-[#242634] flex flex-col gap-1">
                <span className="text-[11px] text-neutral-400">Drive Gain</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={fx.amp.gain}
                  onChange={(e) => updateFX(p => ({ ...p, amp: { ...p.amp, gain: Number(e.target.value) } }))}
                  className="accent-amber-500"
                />
              </div>

              <div className="bg-[#121319] p-3 rounded-xl border border-[#242634] flex flex-col gap-1">
                <span className="text-[11px] text-neutral-400">Mid Range</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={fx.amp.mid}
                  onChange={(e) => updateFX(p => ({ ...p, amp: { ...p.amp, mid: Number(e.target.value) } }))}
                  className="accent-amber-500"
                />
              </div>

              <div className="bg-[#121319] p-3 rounded-xl border border-[#242634] flex flex-col gap-1">
                <span className="text-[11px] text-neutral-400">Presence</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={fx.amp.presence}
                  onChange={(e) => updateFX(p => ({ ...p, amp: { ...p.amp, presence: Number(e.target.value) } }))}
                  className="accent-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. VOCAL PITCH CORRECTION */}
        {activeTab === 'pitch' && (
          <div className="w-full max-w-3xl bg-[#171822] border border-[#2b2d3d] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#252735] pb-3">
              <span className="font-bold text-sm text-white tracking-wide">VOCAL PITCH CORRECTION & TUNING GRID</span>
              <button
                onClick={() => updateFX(p => ({ ...p, pitchCorrection: { ...p.pitchCorrection, enabled: !p.pitchCorrection.enabled } }))}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  fx.pitchCorrection.enabled ? 'bg-pink-600 text-white' : 'bg-[#252734] text-neutral-400'
                }`}
              >
                {fx.pitchCorrection.enabled ? 'TUNE ON' : 'BYPASSED'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-2">
                <span className="text-xs text-neutral-400">Root Key</span>
                <select
                  value={fx.pitchCorrection.rootKey}
                  onChange={(e) => updateFX(p => ({ ...p, pitchCorrection: { ...p.pitchCorrection, rootKey: e.target.value } }))}
                  className="bg-[#20222a] text-white p-2 rounded font-semibold text-xs"
                >
                  {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-2">
                <span className="text-xs text-neutral-400">Scale Mode</span>
                <select
                  value={fx.pitchCorrection.scale}
                  onChange={(e) => updateFX(p => ({ ...p, pitchCorrection: { ...p.pitchCorrection, scale: e.target.value as any } }))}
                  className="bg-[#20222a] text-white p-2 rounded font-semibold text-xs"
                >
                  <option value="minor">Natural Minor</option>
                  <option value="major">Major</option>
                  <option value="chromatic">Chromatic</option>
                  <option value="pentatonic">Pentatonic</option>
                </select>
              </div>

              <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Retune Speed</span>
                  <span className="font-mono text-pink-400 font-bold">{fx.pitchCorrection.speed}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fx.pitchCorrection.speed}
                  onChange={(e) => updateFX(p => ({ ...p, pitchCorrection: { ...p.pitchCorrection, speed: Number(e.target.value) } }))}
                  className="accent-pink-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. REVERB / DELAY / SATURATION */}
        {(activeTab === 'reverb' || activeTab === 'delay' || activeTab === 'sat') && (
          <div className="w-full max-w-3xl bg-[#171822] border border-[#2b2d3d] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <span className="font-bold text-sm text-white tracking-wide uppercase">
              {activeTab === 'reverb' ? 'Studio Convolution & Algorithmic Reverb' : activeTab === 'delay' ? 'Stereo Ping-Pong Delay' : 'Vintage Analog Tape Saturation'}
            </span>
            <div className="bg-[#121319] p-6 rounded-xl border border-[#242634] flex flex-col gap-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Wet / Dry Balance</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue="0.3"
                  className="w-48 accent-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Space / Decay Size</span>
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.1"
                  defaultValue="2.5"
                  className="w-48 accent-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
