/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Play, 
  Square, 
  Check, 
  Sparkles, 
  Volume2, 
  Mic, 
  Scissors 
} from 'lucide-react';
import { Track, VocalTake } from '../types/daw';

interface VocalCompingModalProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
  onCommitComp: (trackId: string, compSummary: string) => void;
}

export const VocalCompingModal: React.FC<VocalCompingModalProps> = ({
  track,
  isOpen,
  onClose,
  onCommitComp,
}) => {
  if (!isOpen) return null;

  const [activeAuditionTake, setActiveAuditionTake] = useState<string | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<{ bar: number; takeId: string }[]>([
    { bar: 1, takeId: 'take-1' },
    { bar: 2, takeId: 'take-1' },
    { bar: 3, takeId: 'take-2' },
    { bar: 4, takeId: 'take-2' },
    { bar: 5, takeId: 'take-1' },
    { bar: 6, takeId: 'take-3' },
    { bar: 7, takeId: 'take-2' },
    { bar: 8, takeId: 'take-1' },
  ]);

  const bars = [1, 2, 3, 4, 5, 6, 7, 8];

  const handleSelectBarTake = (bar: number, takeId: string) => {
    setSelectedRegions(prev => prev.map(r => (r.bar === bar ? { ...r, takeId } : r)));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#171822] border border-[#2b2d3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-[#252735] flex items-center justify-between bg-[#14151c]">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-pink-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Vocal Comping Studio: {track.name}
              </h2>
              <p className="text-[11px] text-neutral-400">
                Click any bar segment across takes to swipe and composite the master vocal performance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#252733] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[75vh]">
          {/* Top Bar Ruler */}
          <div className="flex items-center pl-36 pr-4 gap-2">
            {bars.map(b => (
              <div key={b} className="flex-1 text-center font-mono text-xs font-bold text-neutral-400">
                BAR {b}
              </div>
            ))}
          </div>

          {/* Takes Grid */}
          <div className="flex flex-col gap-3">
            {track.takes.map((take) => (
              <div
                key={take.id}
                className="flex items-center gap-4 bg-[#121319] p-3 rounded-xl border border-[#242634]"
              >
                {/* Take Header & Audition */}
                <div className="w-32 flex flex-col justify-between shrink-0">
                  <span className="font-bold text-xs text-white truncate">{take.name}</span>
                  <button
                    onClick={() => setActiveAuditionTake(activeAuditionTake === take.id ? null : take.id)}
                    className={`mt-2 flex items-center justify-center gap-1.5 py-1 px-2 rounded text-[10px] font-semibold transition-colors ${
                      activeAuditionTake === take.id
                        ? 'bg-pink-600 text-white'
                        : 'bg-[#20222c] text-neutral-300 hover:text-white'
                    }`}
                  >
                    {activeAuditionTake === take.id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{activeAuditionTake === take.id ? 'Stop' : 'Solo Take'}</span>
                  </button>
                </div>

                {/* Bar Segments */}
                <div className="flex-1 flex gap-2">
                  {bars.map((bar) => {
                    const isSelected = selectedRegions.find(r => r.bar === bar)?.takeId === take.id;

                    return (
                      <div
                        key={bar}
                        onClick={() => handleSelectBarTake(bar, take.id)}
                        className={`flex-1 h-14 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between p-1.5 overflow-hidden ${
                          isSelected
                            ? 'bg-pink-600/25 border-pink-500 shadow-md shadow-pink-500/20'
                            : 'bg-[#181924] border-[#222432] hover:border-neutral-500 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[9px] font-mono">
                          <span className={isSelected ? 'text-pink-300 font-bold' : 'text-neutral-500'}>
                            {isSelected ? 'ACTIVE' : ''}
                          </span>
                        </div>
                        {/* Mini Waveform preview line */}
                        <div className="w-full h-4 flex items-center justify-center">
                          <div className={`w-full h-1 rounded ${isSelected ? 'bg-pink-400' : 'bg-neutral-600'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Master Comped Result Preview */}
          <div className="bg-[#0e0f14] p-4 rounded-xl border border-pink-500/40 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-pink-400">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>COMPOSITE MASTER PREVIEW</span>
              </div>
              <span className="font-mono text-[11px] text-neutral-400">8 Bars Selected</span>
            </div>
            <div className="flex items-center gap-2 pt-2">
              {bars.map((b) => {
                const assigned = selectedRegions.find(r => r.bar === b);
                const takeObj = track.takes.find(t => t.id === assigned?.takeId);
                return (
                  <div
                    key={b}
                    className="flex-1 h-8 bg-pink-950/40 border border-pink-500/60 rounded flex items-center justify-center text-[10px] font-mono font-bold text-pink-200"
                  >
                    T{takeObj?.takeIndex}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-16 px-6 border-t border-[#252735] bg-[#14151c] flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            Crossfades applied smoothly at bar boundaries
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#20222a] hover:bg-[#282a36] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onCommitComp(track.id, 'Vocal comp committed');
                onClose();
              }}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-pink-600 hover:bg-pink-500 shadow-md transition-colors"
            >
              Commit Comp to Master Vocal Track
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
