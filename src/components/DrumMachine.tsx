/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Sparkles, 
  Sliders, 
  Layers, 
  Zap,
  Volume2
} from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

interface DrumPad {
  id: string;
  name: string;
  key: string;
  instrument: 'kick' | 'snare' | 'hihat' | 'openhat' | 'clap' | 'tom' | 'crash';
  color: string;
}

const DRUM_PADS: DrumPad[] = [
  { id: 'p1', name: '808 Kick', key: '1', instrument: 'kick', color: '#f97316' },
  { id: 'p2', name: 'Snare Hard', key: '2', instrument: 'snare', color: '#3b82f6' },
  { id: 'p3', name: 'Closed Hat', key: '3', instrument: 'hihat', color: '#10b981' },
  { id: 'p4', name: 'Open Hat', key: '4', instrument: 'openhat', color: '#8b5cf6' },
  { id: 'p5', name: 'Studio Clap', key: 'Q', instrument: 'clap', color: '#ec4899' },
  { id: 'p6', name: 'Low Tom', key: 'W', instrument: 'tom', color: '#eab308' },
  { id: 'p7', name: 'High Tom', key: 'E', instrument: 'tom', color: '#14b8a6' },
  { id: 'p8', name: 'Crash Cymbal', key: 'R', instrument: 'crash', color: '#06b6d4' },
  { id: 'p9', name: 'Punch Kick', key: 'A', instrument: 'kick', color: '#f97316' },
  { id: 'p10', name: 'Snap Snare', key: 'S', instrument: 'snare', color: '#3b82f6' },
  { id: 'p11', name: 'Trap Hat', key: 'D', instrument: 'hihat', color: '#10b981' },
  { id: 'p12', name: 'Shaker Fill', key: 'F', instrument: 'hihat', color: '#8b5cf6' },
  { id: 'p13', name: 'Side Clap', key: 'Z', instrument: 'clap', color: '#ec4899' },
  { id: 'p14', name: 'Floor Tom', key: 'X', instrument: 'tom', color: '#eab308' },
  { id: 'p15', name: 'Splash Cymbal', key: 'C', instrument: 'crash', color: '#14b8a6' },
  { id: 'p16', name: 'Sub Drop', key: 'V', instrument: 'kick', color: '#f43f5e' },
];

const PRESETS: Record<string, boolean[][]> = {
  'Synthwave 80s': [
    [true, false, false, false, true, false, false, false, true, false, false, false, true, false, true, false], // Kick
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], // HiHat
    [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Open Hat
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Clap
    [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true], // Tom
  ],
  'Four on Floor': [
    [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare
    [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // HiHat
    [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Open Hat
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Clap
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Tom
  ],
  'Boom Bap Hip-Hop': [
    [true, false, false, false, false, false, true, false, false, true, false, false, false, false, false, false], // Kick
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare
    [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], // HiHat
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false], // Open Hat
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Clap
    [false, false, false, false, false, false, false, false, false, false, false, false, false, true, false, false], // Tom
  ],
};

export const DrumMachine: React.FC = () => {
  const [activePadId, setActivePadId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [isSequencerRunning, setIsSequencerRunning] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(120);

  // 6 Step Sequencer Rows
  const rowInstruments: { label: string; inst: 'kick' | 'snare' | 'hihat' | 'openhat' | 'clap' | 'tom' }[] = [
    { label: 'Kick Drum', inst: 'kick' },
    { label: 'Snare Drum', inst: 'snare' },
    { label: 'Closed Hi-Hat', inst: 'hihat' },
    { label: 'Open Hi-Hat', inst: 'openhat' },
    { label: 'Clap', inst: 'clap' },
    { label: 'Low Tom', inst: 'tom' },
  ];

  const [sequence, setSequence] = useState<boolean[][]>(PRESETS['Synthwave 80s']);

  const triggerPad = (pad: DrumPad) => {
    setActivePadId(pad.id);
    if (audioEngine.synth) {
      audioEngine.synth.triggerDrum(pad.instrument);
    }
    setTimeout(() => setActivePadId(null), 120);
  };

  // Step sequencer clock
  useEffect(() => {
    if (!isSequencerRunning) {
      setCurrentStep(-1);
      return;
    }

    const stepInterval = (60 / bpm / 4) * 1000; // 16th note interval
    let step = 0;

    const timer = setInterval(() => {
      setCurrentStep(step);

      // Trigger active instruments on this step
      rowInstruments.forEach((row, rowIdx) => {
        if (sequence[rowIdx] && sequence[rowIdx][step]) {
          audioEngine.synth?.triggerDrum(row.inst);
        }
      });

      step = (step + 1) % 16;
    }, stepInterval);

    return () => clearInterval(timer);
  }, [isSequencerRunning, bpm, sequence]);

  const toggleStep = (rowIdx: number, stepIdx: number) => {
    setSequence(prev => {
      const next = prev.map(r => [...r]);
      next[rowIdx][stepIdx] = !next[rowIdx][stepIdx];
      return next;
    });
  };

  const loadPreset = (name: string) => {
    if (PRESETS[name]) {
      setSequence(PRESETS[name]);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121317] overflow-hidden select-none">
      {/* Subheader */}
      <div className="h-10 border-b border-[#22242c] bg-[#16171d] px-6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-200">16-PAD SAMPLER & 16-STEP SEQUENCER</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400 font-mono">Analog 808 / 909 Engine</span>
        </div>

        {/* Sequencer Play / Stop / Presets */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#20222a] px-2 py-0.5 rounded border border-[#2b2d38]">
            <span className="text-[10px] text-neutral-400 font-mono">PRESET:</span>
            <select
              onChange={(e) => loadPreset(e.target.value)}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="Synthwave 80s" className="bg-[#1a1b22]">Synthwave 80s</option>
              <option value="Four on Floor" className="bg-[#1a1b22]">Four on Floor (EDM)</option>
              <option value="Boom Bap Hip-Hop" className="bg-[#1a1b22]">Boom Bap Hip-Hop</option>
            </select>
          </div>

          <button
            onClick={() => setIsSequencerRunning(!isSequencerRunning)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold shadow-sm transition-all ${
              isSequencerRunning
                ? 'bg-rose-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isSequencerRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isSequencerRunning ? 'Stop Loop' : 'Run Pattern'}</span>
          </button>
        </div>
      </div>

      {/* Main Container Split: 16-Pad Matrix on Left, 16-Step Sequencer on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto p-4 gap-6">
        {/* 16-Pad MPC Style Sampler */}
        <div className="w-full lg:w-96 flex flex-col bg-[#161720] border border-[#232532] rounded-xl p-4 shadow-lg shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-[#242636] mb-3">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Tactile Drum Pads
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">QWERTY Key Triggers</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 flex-1">
            {DRUM_PADS.map((pad) => {
              const isActive = activePadId === pad.id;
              return (
                <button
                  key={pad.id}
                  onClick={() => triggerPad(pad)}
                  className={`h-20 rounded-lg flex flex-col justify-between p-2 text-left border transition-all active:scale-95 ${
                    isActive
                      ? 'bg-white text-black shadow-lg scale-95'
                      : 'bg-[#1e202c] text-neutral-200 border-[#2b2d3d] hover:border-neutral-400'
                  }`}
                  style={{
                    borderLeftColor: pad.color,
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-[10px] font-bold opacity-60">[{pad.key}]</span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pad.color }} />
                  </div>
                  <span className="font-bold text-xs truncate leading-tight">{pad.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 16-Step Sequencer Grid */}
        <div className="flex-1 flex flex-col bg-[#161720] border border-[#232532] rounded-xl p-4 shadow-lg overflow-x-auto">
          <div className="flex items-center justify-between pb-3 border-b border-[#242636] mb-3">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              16-Step Pattern Grid
            </span>
            <button
              onClick={() => setSequence(rowInstruments.map(() => Array(16).fill(false)))}
              className="text-[10px] text-neutral-400 hover:text-rose-400 font-medium"
            >
              Clear Pattern
            </button>
          </div>

          {/* Steps Header (1 to 16 with beat markers) */}
          <div className="flex items-center pb-2 pl-32 gap-1 text-[10px] font-mono text-neutral-500">
            {Array.from({ length: 16 }).map((_, stepIdx) => (
              <div
                key={stepIdx}
                className={`w-9 text-center font-bold ${
                  currentStep === stepIdx ? 'text-amber-400' : stepIdx % 4 === 0 ? 'text-neutral-300' : ''
                }`}
              >
                {stepIdx + 1}
              </div>
            ))}
          </div>

          {/* Instrument Rows */}
          <div className="flex flex-col gap-2 flex-1 justify-around">
            {rowInstruments.map((row, rowIdx) => (
              <div key={row.label} className="flex items-center gap-2">
                {/* Row Label */}
                <div className="w-28 text-xs font-semibold text-neutral-300 truncate">
                  {row.label}
                </div>

                {/* 16 Step Buttons */}
                <div className="flex items-center gap-1 flex-1">
                  {Array.from({ length: 16 }).map((_, stepIdx) => {
                    const isStepActive = sequence[rowIdx] && sequence[rowIdx][stepIdx];
                    const isPlayheadHere = currentStep === stepIdx;
                    const isBeatStart = stepIdx % 4 === 0;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => toggleStep(rowIdx, stepIdx)}
                        className={`w-9 h-10 rounded border transition-all ${
                          isStepActive
                            ? isPlayheadHere
                              ? 'bg-amber-400 border-white text-black font-bold shadow-md shadow-amber-500/50 scale-105'
                              : 'bg-blue-600 border-blue-400 shadow-sm'
                            : isPlayheadHere
                            ? 'bg-[#2a2d3d] border-amber-400'
                            : isBeatStart
                            ? 'bg-[#20222f] border-[#2f3244] hover:bg-[#282a3a]'
                            : 'bg-[#191a24] border-[#242636] hover:bg-[#222432]'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
