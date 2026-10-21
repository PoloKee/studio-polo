/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Circle, 
  Repeat, 
  Clock, 
  Volume2, 
  Sliders, 
  Music2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ProjectSession } from '../types/daw';
import { MeterData } from '../audio/AudioEngine';

interface TransportBarProps {
  session: ProjectSession;
  isPlaying: boolean;
  isRecording: boolean;
  currentTime: number;
  meterData: MeterData | null;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecord: () => void;
  onSeek: (time: number) => void;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  session,
  isPlaying,
  isRecording,
  currentTime,
  meterData,
  onPlay,
  onPause,
  onStop,
  onRecord,
  onSeek,
  onUpdateSession,
}) => {
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  // Format Bar:Beat:Tick
  const secondsPerBeat = 60 / session.bpm;
  const beatsPerBar = session.timeSignature[0];
  const totalBeats = currentTime / secondsPerBeat;
  const bar = Math.floor(totalBeats / beatsPerBar) + 1;
  const beat = (Math.floor(totalBeats) % beatsPerBar) + 1;
  const tick = Math.floor((totalBeats % 1) * 960);

  // Format SMPTE 00:00.000
  const minutes = Math.floor(currentTime / 60);
  const seconds = Math.floor(currentTime % 60);
  const ms = Math.floor((currentTime % 1) * 1000);
  const smpte = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

  const handleTapTempo = () => {
    const now = performance.now();
    const newTapTimes = [...tapTimes.slice(-4), now];
    setTapTimes(newTapTimes);

    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        onUpdateSession(prev => ({ ...prev, bpm: calculatedBpm }));
      }
    }
  };

  return (
    <div className="h-16 border-b border-[#262830] bg-[#1a1b22] px-4 flex items-center justify-between gap-4 shrink-0 shadow-inner">
      {/* Group 1: Transport Playback Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onSeek(0)}
          title="Return to Zero (Home)"
          className="p-2 text-neutral-400 hover:text-white hover:bg-[#262832] rounded transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSeek(Math.max(0, currentTime - secondsPerBeat * beatsPerBar))}
          title="Back 1 Bar"
          className="p-2 text-neutral-400 hover:text-white hover:bg-[#262832] rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onStop}
          title="Stop (Enter/Space)"
          className="p-2 text-neutral-400 hover:text-white hover:bg-[#262832] rounded transition-colors"
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          title="Play / Pause (Space)"
          className={`p-2.5 rounded-md transition-all shadow-md ${
            isPlaying
              ? 'bg-emerald-600 text-white hover:bg-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-[#282a35] text-neutral-200 hover:bg-[#323542] hover:text-white'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => onSeek(currentTime + secondsPerBeat * beatsPerBar)}
          title="Forward 1 Bar"
          className="p-2 text-neutral-400 hover:text-white hover:bg-[#262832] rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onRecord}
          title="Record (R)"
          className={`p-2.5 rounded-md transition-all ${
            isRecording
              ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
              : 'text-rose-500 hover:bg-[#282a35] hover:text-rose-400'
          }`}
        >
          <Circle className={`w-4 h-4 ${isRecording ? 'fill-white' : 'fill-rose-500'}`} />
        </button>

        <div className="h-6 w-px bg-[#2a2c36] mx-1" />

        {/* Loop Region Toggle */}
        <button
          onClick={() => onUpdateSession(prev => ({ ...prev, loopEnabled: !prev.loopEnabled }))}
          title="Toggle Loop Cycle (C)"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            session.loopEnabled
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#242630]'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Loop</span>
        </button>

        {/* Metronome */}
        <button
          onClick={() => onUpdateSession(prev => ({ ...prev, countInEnabled: !prev.countInEnabled }))}
          title="Metronome Click (K)"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            session.countInEnabled
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#242630]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Click</span>
        </button>
      </div>

      {/* Group 2: Timecode / Position Display */}
      <div className="flex items-center gap-3 bg-[#111216] border border-[#252731] px-3.5 py-1.5 rounded-lg shadow-inner">
        {/* Bars & Beats */}
        <div className="flex flex-col items-center">
          <div className="flex items-baseline font-mono text-sm tracking-wider text-blue-400 font-bold tabular-nums">
            <span>{String(bar).padStart(3, '0')}</span>
            <span className="text-neutral-600 mx-0.5">.</span>
            <span>{beat}</span>
            <span className="text-neutral-600 mx-0.5">.</span>
            <span className="text-xs text-blue-300/80">{String(tick).padStart(3, '0')}</span>
          </div>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
            Bar·Beat·Tick
          </span>
        </div>

        <div className="h-6 w-px bg-[#262833]" />

        {/* SMPTE Timecode */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-xs tracking-wider text-neutral-300 font-medium tabular-nums">
            {smpte}
          </span>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
            Timecode
          </span>
        </div>
      </div>

      {/* Group 3: Musical Parameters (BPM, Signature, Snap Grid) */}
      <div className="hidden lg:flex items-center gap-3">
        {/* BPM and Tap */}
        <div className="flex items-center gap-1.5 bg-[#14151a] border border-[#262832] px-2.5 py-1 rounded-md">
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-500 uppercase font-semibold">Tempo</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="40"
                max="260"
                value={session.bpm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 40 && val <= 260) {
                    onUpdateSession(prev => ({ ...prev, bpm: val }));
                  }
                }}
                className="w-12 bg-transparent text-xs font-mono font-bold text-neutral-200 focus:outline-none"
              />
              <span className="text-[10px] text-neutral-500">BPM</span>
            </div>
          </div>
          <button
            onClick={handleTapTempo}
            className="px-1.5 py-1 text-[10px] font-semibold text-neutral-400 hover:text-white bg-[#22242c] hover:bg-[#2c2e38] rounded border border-[#2d303b] transition-colors"
          >
            TAP
          </button>
        </div>

        {/* Time Signature */}
        <div className="flex flex-col bg-[#14151a] border border-[#262832] px-2.5 py-1 rounded-md">
          <span className="text-[9px] text-neutral-500 uppercase font-semibold">Signature</span>
          <select
            value={`${session.timeSignature[0]}/${session.timeSignature[1]}`}
            onChange={(e) => {
              const [num, den] = e.target.value.split('/').map(Number);
              onUpdateSession(prev => ({ ...prev, timeSignature: [num, den] }));
            }}
            className="bg-transparent text-xs font-mono font-bold text-neutral-200 focus:outline-none cursor-pointer"
          >
            <option value="4/4" className="bg-[#1a1b22]">4/4</option>
            <option value="3/4" className="bg-[#1a1b22]">3/4</option>
            <option value="6/8" className="bg-[#1a1b22]">6/8</option>
            <option value="2/4" className="bg-[#1a1b22]">2/4</option>
          </select>
        </div>

        {/* Snap Grid */}
        <div className="flex flex-col bg-[#14151a] border border-[#262832] px-2.5 py-1 rounded-md">
          <span className="text-[9px] text-neutral-500 uppercase font-semibold">Snap Grid</span>
          <select
            value={session.snapGrid}
            onChange={(e) => {
              const grid = e.target.value as ProjectSession['snapGrid'];
              onUpdateSession(prev => ({ ...prev, snapGrid: grid }));
            }}
            className="bg-transparent text-xs font-mono font-bold text-neutral-200 focus:outline-none cursor-pointer"
          >
            <option value="1/1" className="bg-[#1a1b22]">1 Bar (1/1)</option>
            <option value="1/2" className="bg-[#1a1b22]">1/2 Note</option>
            <option value="1/4" className="bg-[#1a1b22]">1/4 Note</option>
            <option value="1/8" className="bg-[#1a1b22]">1/8 Note</option>
            <option value="1/16" className="bg-[#1a1b22]">1/16 Note</option>
            <option value="1/32" className="bg-[#1a1b22]">1/32 Note</option>
            <option value="off" className="bg-[#1a1b22]">Snap Off</option>
          </select>
        </div>
      </div>

      {/* Group 4: Master Output Meter & LUFS Quick Display */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end text-right">
          <div className="flex items-baseline gap-1.5 font-mono text-xs tabular-nums font-semibold">
            <span className="text-neutral-400 text-[10px]">LUFS:</span>
            <span className={meterData && meterData.lufs > -10 ? 'text-amber-400' : 'text-neutral-200'}>
              {meterData ? meterData.lufs.toFixed(1) : '-60.0'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 font-mono text-[10px] tabular-nums text-neutral-400">
            <span>PEAK:</span>
            <span className={meterData && meterData.truePeak > -0.1 ? 'text-rose-400 font-bold' : 'text-neutral-300'}>
              {meterData ? `${meterData.truePeak.toFixed(1)} dB` : '-60.0 dB'}
            </span>
          </div>
        </div>

        {/* Master Stereo LED Ladder */}
        <div className="flex items-center gap-1 bg-[#101115] p-1.5 rounded border border-[#252731]">
          {/* L channel */}
          <div className="w-2 h-7 bg-[#1c1e26] rounded-sm overflow-hidden flex flex-col justify-end">
            <div
              className="w-full meter-led transition-all duration-75"
              style={{
                height: `${Math.max(0, Math.min(100, ((meterData?.peakL ?? -60) + 60) * 1.66))}%`,
              }}
            />
          </div>
          {/* R channel */}
          <div className="w-2 h-7 bg-[#1c1e26] rounded-sm overflow-hidden flex flex-col justify-end">
            <div
              className="w-full meter-led transition-all duration-75"
              style={{
                height: `${Math.max(0, Math.min(100, ((meterData?.peakR ?? -60) + 60) * 1.66))}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
