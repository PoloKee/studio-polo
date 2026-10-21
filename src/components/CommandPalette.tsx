/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Layers, 
  Sliders, 
  Music, 
  Volume2, 
  Disc, 
  Move3d, 
  Sparkles, 
  Command, 
  Play, 
  Download, 
  Plus, 
  RotateCcw,
  Zap
} from 'lucide-react';
import { DAWView } from '../types/daw';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: DAWView) => void;
  onPlay: () => void;
  onStop: () => void;
  onExport: () => void;
  onAddTrack: (type: 'audio' | 'instrument') => void;
  onUndo: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectView,
  onPlay,
  onStop,
  onExport,
  onAddTrack,
  onUndo,
}) => {
  if (!isOpen) return null;

  const [query, setQuery] = useState('');

  const actions = [
    { id: 'view-timeline', title: 'Switch to Timeline / Arrange View', category: 'Navigation', icon: <Layers className="w-4 h-4 text-blue-400" />, run: () => onSelectView('timeline') },
    { id: 'view-mixer', title: 'Switch to Mixing Console', category: 'Navigation', icon: <Sliders className="w-4 h-4 text-indigo-400" />, run: () => onSelectView('mixer') },
    { id: 'view-spatial', title: 'Switch to Dolby Atmos & 3D Spatial Audio', category: 'Navigation', icon: <Move3d className="w-4 h-4 text-purple-400" />, run: () => onSelectView('spatial') },
    { id: 'view-ai', title: 'Open Studio Polo AI Suite & Mix Assistant', category: 'Intelligence', icon: <Sparkles className="w-4 h-4 text-amber-400" />, run: () => onSelectView('aisuite') },
    { id: 'view-launcher', title: 'Switch to Non-Linear Clip Launcher', category: 'Navigation', icon: <Zap className="w-4 h-4 text-emerald-400" />, run: () => onSelectView('cliplauncher') },
    { id: 'view-drums', title: 'Open 16-Pad Drum Sampler & Step Sequencer', category: 'Instruments', icon: <Volume2 className="w-4 h-4 text-orange-400" />, run: () => onSelectView('drums') },
    { id: 'view-piano', title: 'Open MIDI Piano Roll & Chord Generator', category: 'Instruments', icon: <Music className="w-4 h-4 text-pink-400" />, run: () => onSelectView('pianoroll') },
    { id: 'view-mastering', title: 'Open Album Mastering & LUFS Radar', category: 'Mastering', icon: <Disc className="w-4 h-4 text-blue-400" />, run: () => onSelectView('mastering') },
    { id: 'act-play', title: 'Play / Pause Session (Space)', category: 'Transport', icon: <Play className="w-4 h-4 text-emerald-400" />, run: onPlay },
    { id: 'act-stop', title: 'Stop & Return to Zero (Enter)', category: 'Transport', icon: <RotateCcw className="w-4 h-4 text-neutral-400" />, run: onStop },
    { id: 'act-export', title: 'Export Release Master WAV (24-bit / 48kHz)', category: 'Delivery', icon: <Download className="w-4 h-4 text-blue-400" />, run: onExport },
    { id: 'act-add-audio', title: 'Add New Audio Track', category: 'Editing', icon: <Plus className="w-4 h-4 text-cyan-400" />, run: () => onAddTrack('audio') },
    { id: 'act-add-inst', title: 'Add New Instrument Track', category: 'Editing', icon: <Plus className="w-4 h-4 text-purple-400" />, run: () => onAddTrack('instrument') },
    { id: 'act-undo', title: 'Undo Last Action (Ctrl+Z)', category: 'History', icon: <RotateCcw className="w-4 h-4 text-rose-400" />, run: onUndo },
  ];

  const filtered = actions.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="w-full max-w-xl bg-[#171822] border border-[#2b2d3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="h-14 px-4 border-b border-[#242635] flex items-center gap-3 bg-[#13141b]">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, tool, view, or plugin name (e.g. 'Atmos', 'Master', 'EQ')..."
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
          <span className="text-[10px] font-mono text-neutral-500 px-1.5 py-0.5 bg-[#20222e] rounded border border-[#2a2c3a]">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-96 overflow-y-auto divide-y divide-[#1e202c]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-500 font-mono">
              No matching commands found.
            </div>
          ) : (
            filtered.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.run();
                  onClose();
                }}
                className="w-full p-2.5 rounded-lg flex items-center justify-between hover:bg-[#20222f] transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[#14151c] rounded-md border border-[#262838]">
                    {action.icon}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 group-hover:text-white block">
                      {action.title}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {action.category}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono group-hover:text-blue-400">
                  Select ↵
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
