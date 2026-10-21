/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sliders, 
  Activity, 
  Volume2, 
  Disc, 
  Radio, 
  Check, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { ProjectSession, Track } from '../types/daw';
import { MeterData } from '../audio/AudioEngine';

interface MixerConsoleProps {
  session: ProjectSession;
  meterData: MeterData | null;
  trackPeaks: Map<string, { l: number; r: number }>;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
  onSelectTrackForFX: (trackId: string) => void;
}

export const MixerConsole: React.FC<MixerConsoleProps> = ({
  session,
  meterData,
  trackPeaks,
  onUpdateSession,
  onSelectTrackForFX,
}) => {
  const [referenceMode, setReferenceMode] = useState(false);

  const updateTrack = (trackId: string, updates: Partial<Track>) => {
    onUpdateSession(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => (t.id === trackId ? { ...t, ...updates } : t)),
    }));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121317] overflow-hidden select-none">
      {/* Console Subheader / Routing Matrix Toolbar */}
      <div className="h-10 border-b border-[#22242c] bg-[#16171d] px-6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-300">STUDIO MIXING CONSOLE</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">Summing Engine: 64-bit Floating Point</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Reference Track A/B Switch */}
          <button
            onClick={() => setReferenceMode(!referenceMode)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              referenceMode
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-[#22242e] text-neutral-300 hover:text-white border border-[#2e313d]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>A/B Reference Match ({referenceMode ? 'REF' : 'MIX'})</span>
          </button>
        </div>
      </div>

      {/* Channel Strips Container */}
      <div className="flex-1 flex overflow-x-auto p-4 gap-3 items-stretch">
        {/* Track Channel Strips */}
        {session.tracks.map((track) => {
          const peaks = trackPeaks.get(track.id) || { l: -60, r: -60 };
          const peakLPercent = Math.max(0, Math.min(100, (peaks.l + 60) * 1.66));
          const peakRPercent = Math.max(0, Math.min(100, (peaks.r + 60) * 1.66));

          return (
            <div
              key={track.id}
              className="w-36 flex flex-col justify-between bg-[#171820] border border-[#232530] rounded-lg shadow-lg overflow-hidden shrink-0"
            >
              {/* Channel Header */}
              <div
                className="h-7 px-2 flex items-center justify-between text-[11px] font-bold text-white truncate"
                style={{ backgroundColor: `${track.color}ee` }}
              >
                <span className="truncate">{track.name}</span>
                <span className="font-mono text-[9px] opacity-80 uppercase">{track.type.slice(0, 3)}</span>
              </div>

              {/* Strip Content */}
              <div className="p-2 flex flex-col gap-2 flex-1 justify-between">
                {/* 1. Gain Trim & Phase Invert */}
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <div className="flex flex-col">
                    <span className="text-neutral-500 font-mono text-[9px]">TRIM</span>
                    <span className="font-mono text-neutral-300">
                      {track.gainTrim > 0 ? `+${track.gainTrim}` : track.gainTrim}dB
                    </span>
                  </div>
                  <button
                    onClick={() => updateTrack(track.id, { phaseInvert: !track.phaseInvert })}
                    className={`w-6 h-6 rounded font-mono text-xs font-semibold flex items-center justify-center transition-colors ${
                      track.phaseInvert ? 'bg-purple-600 text-white' : 'bg-[#22242f] text-neutral-400 hover:text-white'
                    }`}
                    title="Phase Invert (Ø)"
                  >
                    Ø
                  </button>
                </div>

                {/* 2. Mini EQ & Comp Status */}
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    onClick={() => onSelectTrackForFX(track.id)}
                    className="p-1 rounded bg-[#1e202a] border border-[#2b2d3a] hover:border-blue-500 flex flex-col items-center justify-center text-center transition-colors"
                  >
                    <span className="text-[9px] text-neutral-500 font-mono">EQ</span>
                    <span className="text-blue-400 font-semibold">{track.fx.eq.enabled ? 'ACTIVE' : 'BYPASS'}</span>
                  </button>
                  <button
                    onClick={() => onSelectTrackForFX(track.id)}
                    className="p-1 rounded bg-[#1e202a] border border-[#2b2d3a] hover:border-emerald-500 flex flex-col items-center justify-center text-center transition-colors"
                  >
                    <span className="text-[9px] text-neutral-500 font-mono">COMP</span>
                    <span className="text-emerald-400 font-semibold">{track.fx.compressor.enabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* 3. Aux Sends (Reverb & Delay) */}
                <div className="flex flex-col gap-1 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">S1 REV</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={track.sendReverb}
                      onChange={(e) => updateTrack(track.id, { sendReverb: Number(e.target.value) })}
                      className="w-14 h-1 bg-[#282a36] rounded appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">S2 DLY</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={track.sendDelay}
                      onChange={(e) => updateTrack(track.id, { sendDelay: Number(e.target.value) })}
                      className="w-14 h-1 bg-[#282a36] rounded appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* 4. Stereo Pan Slider */}
                <div className="flex flex-col gap-0.5 text-[10px]">
                  <div className="flex items-center justify-between text-neutral-400 font-mono">
                    <span>PAN</span>
                    <span>{track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : `R${Math.round(track.pan * 100)}`}</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={track.pan}
                    onChange={(e) => updateTrack(track.id, { pan: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#282a36] rounded appearance-none cursor-pointer"
                  />
                </div>

                {/* 5. Solo, Mute, Arm, Monitor */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => updateTrack(track.id, { armed: !track.armed })}
                    className={`h-6 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                      track.armed ? 'bg-rose-600 text-white' : 'bg-[#22242f] text-neutral-400 hover:text-white'
                    }`}
                    title="Record Arm"
                  >
                    R
                  </button>
                  <button
                    onClick={() => updateTrack(track.id, { inputMonitor: !track.inputMonitor })}
                    className={`h-6 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                      track.inputMonitor ? 'bg-amber-500 text-black' : 'bg-[#22242f] text-neutral-400 hover:text-white'
                    }`}
                    title="Input Monitor"
                  >
                    I
                  </button>
                  <button
                    onClick={() => updateTrack(track.id, { soloed: !track.soloed })}
                    className={`h-6 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                      track.soloed ? 'bg-blue-600 text-white' : 'bg-[#22242f] text-neutral-400 hover:text-white'
                    }`}
                    title="Solo"
                  >
                    S
                  </button>
                  <button
                    onClick={() => updateTrack(track.id, { muted: !track.muted })}
                    className={`h-6 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                      track.muted ? 'bg-amber-600 text-white' : 'bg-[#22242f] text-neutral-400 hover:text-white'
                    }`}
                    title="Mute"
                  >
                    M
                  </button>
                </div>

                {/* 6. Precision Fader & Stereo Meter Ladder */}
                <div className="flex-1 min-h-[160px] flex items-stretch justify-center gap-3 pt-2">
                  {/* Vertical Fader Slider */}
                  <div className="flex flex-col items-center justify-between flex-1">
                    <input
                      type="range"
                      min="-60"
                      max="6"
                      step="0.5"
                      value={track.volume}
                      onChange={(e) => updateTrack(track.id, { volume: Number(e.target.value) })}
                      className="h-full -rotate-90 w-36 accent-blue-500 cursor-pointer"
                      style={{ transformOrigin: 'center' }}
                    />
                  </div>

                  {/* Dual Stereo LED Meter */}
                  <div className="flex gap-1 h-36 bg-[#0f1014] p-1 rounded border border-[#232530]">
                    <div className="w-1.5 h-full bg-[#1c1d25] rounded-sm overflow-hidden flex flex-col justify-end">
                      <div
                        className="w-full meter-led transition-all duration-75"
                        style={{ height: `${peakLPercent}%` }}
                      />
                    </div>
                    <div className="w-1.5 h-full bg-[#1c1d25] rounded-sm overflow-hidden flex flex-col justify-end">
                      <div
                        className="w-full meter-led transition-all duration-75"
                        style={{ height: `${peakRPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Fader Readout */}
                <div className="text-center font-mono text-[11px] font-bold text-neutral-200 bg-[#121318] py-1 rounded border border-[#232530]">
                  {track.volume > 0 ? `+${track.volume.toFixed(1)}` : track.volume.toFixed(1)} dB
                </div>
              </div>
            </div>
          );
        })}

        {/* Master Bus Channel Strip (Wider, High-Grade Console Center) */}
        <div className="w-48 flex flex-col justify-between bg-[#191b24] border-2 border-[#383b4b] rounded-lg shadow-2xl overflow-hidden shrink-0">
          {/* Master Header */}
          <div className="h-7 px-3 bg-gradient-to-r from-blue-700 to-indigo-700 flex items-center justify-between text-xs font-bold text-white">
            <span>MASTER BUS</span>
            <span className="font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded">STEREO</span>
          </div>

          <div className="p-3 flex flex-col gap-3 flex-1 justify-between">
            {/* Master Processing Badges */}
            <div className="flex flex-col gap-1.5 bg-[#121319] p-2 rounded border border-[#282a38] text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">TAPE SAT</span>
                <span className="text-emerald-400 font-semibold">WARM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">GLUE COMP</span>
                <span className="text-blue-400 font-semibold">2.5:1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">BRICKWALL</span>
                <span className="text-amber-400 font-semibold">-0.5 dB</span>
              </div>
            </div>

            {/* LUFS & True Peak Big Readouts */}
            <div className="grid grid-cols-2 gap-2 text-center bg-[#101116] p-2 rounded border border-[#252735]">
              <div className="flex flex-col">
                <span className="text-[9px] text-neutral-500 font-mono">INTEGRATED</span>
                <span className="font-mono text-sm font-bold text-white tabular-nums">
                  {meterData ? meterData.lufs.toFixed(1) : '-60.0'}
                </span>
                <span className="text-[8px] text-blue-400">LUFS</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-neutral-500 font-mono">TRUE PEAK</span>
                <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                  {meterData ? meterData.truePeak.toFixed(1) : '-60.0'}
                </span>
                <span className="text-[8px] text-neutral-400">dBFS</span>
              </div>
            </div>

            {/* Master Fader & Meter */}
            <div className="flex-1 min-h-[170px] flex items-stretch justify-center gap-3 pt-2">
              <div className="flex flex-col items-center justify-between flex-1">
                <input
                  type="range"
                  min="-60"
                  max="6"
                  step="0.5"
                  defaultValue="0"
                  className="h-full -rotate-90 w-40 accent-indigo-500 cursor-pointer"
                  style={{ transformOrigin: 'center' }}
                />
              </div>

              {/* Master Full-Scale Stereo Meter */}
              <div className="flex gap-1.5 h-40 bg-[#0c0d11] p-1.5 rounded border border-[#2a2d3c]">
                <div className="w-2.5 h-full bg-[#181922] rounded-sm overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full meter-led transition-all duration-75"
                    style={{
                      height: `${Math.max(0, Math.min(100, ((meterData?.peakL ?? -60) + 60) * 1.66))}%`,
                    }}
                  />
                </div>
                <div className="w-2.5 h-full bg-[#181922] rounded-sm overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full meter-led transition-all duration-75"
                    style={{
                      height: `${Math.max(0, Math.min(100, ((meterData?.peakR ?? -60) + 60) * 1.66))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Master Output Readout */}
            <div className="text-center font-mono text-xs font-bold text-white bg-blue-950/60 py-1.5 rounded border border-blue-800/50">
              0.0 dB (UNITY)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
