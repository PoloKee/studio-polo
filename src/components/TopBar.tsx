/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  FolderOpen, 
  Save, 
  Download, 
  RotateCcw, 
  RotateCw, 
  Activity, 
  Layers, 
  Sliders, 
  Music, 
  Disc, 
  Volume2, 
  Mic,
  Sparkles
} from 'lucide-react';
import { DAWView, ProjectSession } from '../types/daw';

interface TopBarProps {
  session: ProjectSession;
  currentView: DAWView;
  onViewChange: (view: DAWView) => void;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
  onOpenProjectModal: () => void;
  onOpenExportModal: () => void;
  onOpenCommandPalette: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  session,
  currentView,
  onViewChange,
  onUpdateSession,
  onOpenProjectModal,
  onOpenExportModal,
  onOpenCommandPalette,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const views: { id: DAWView; label: string; icon: React.ReactNode }[] = [
    { id: 'timeline', label: 'Arrange', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'mixer', label: 'Console', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'spatial', label: 'Atmos 3D', icon: <Disc className="w-3.5 h-3.5 text-indigo-400" /> },
    { id: 'aisuite', label: 'AI Suite', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'cliplauncher', label: 'Launcher', icon: <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'pianoroll', label: 'MIDI Roll', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'drums', label: 'Drums', icon: <Volume2 className="w-3.5 h-3.5" /> },
    { id: 'fxrack', label: 'Studio FX', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'mastering', label: 'Mastering', icon: <Disc className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="h-14 border-b border-[#262830] bg-[#16171c] px-4 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Zone 1: Wordmark & Session Breadcrumb */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-extrabold text-white text-xs tracking-wider shadow-sm">
            SP
          </div>
          <span className="font-bold text-sm tracking-tight text-white whitespace-nowrap">
            Studio Polo
          </span>
        </div>
        <span className="text-neutral-600 hidden sm:inline">/</span>
        <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
          <span className="text-neutral-200 font-medium truncate max-w-[130px]">
            {session.name}
          </span>
          <span className="text-neutral-600">·</span>
          <span className="font-mono text-neutral-400 text-[11px]">
            {session.sampleRate / 1000}kHz / {session.bitDepth}b
          </span>
        </div>
      </div>

      {/* Zone 2: View Switcher Tabs (Segmented Control) */}
      <nav className="flex items-center gap-1 p-1 bg-[#101114] border border-[#23252d] rounded-lg">
        {views.map((v) => {
          const isActive = currentView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1a1c23]'
              }`}
            >
              {v.icon}
              <span>{v.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Project Actions & Master Export */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-1 mr-2 border-r border-[#262830] pr-3">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:hover:text-neutral-400 rounded hover:bg-[#20222a] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:hover:text-neutral-400 rounded hover:bg-[#20222a] transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={onOpenCommandPalette}
          title="Command Palette (Cmd+K / Ctrl+K)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-[#20222a] hover:bg-[#282a35] border border-[#2e313d] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Commands</span>
          <span className="text-[10px] font-mono text-neutral-500">⌘K</span>
        </button>

        <button
          onClick={onOpenProjectModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-[#20222a] hover:bg-[#282a35] border border-[#2e313d] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
          <span>Projects</span>
        </button>

        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Master</span>
        </button>
      </div>
    </header>
  );
};
