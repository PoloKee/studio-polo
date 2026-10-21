/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  FolderOpen, 
  Save, 
  Upload, 
  Download, 
  Layers, 
  Sparkles, 
  Sliders, 
  Check, 
  Cpu 
} from 'lucide-react';
import { ProjectSession } from '../types/daw';
import { createDefaultFXParams } from '../audio/defaultSession';

interface ProjectModalProps {
  session: ProjectSession;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
  onLoadTemplate: (templateName: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  session,
  isOpen,
  onClose,
  onUpdateSession,
  onLoadTemplate,
}) => {
  if (!isOpen) return null;

  const [bufferSize, setBufferSize] = useState<number>(256);

  // Save session as JSON file
  const handleSaveSession = () => {
    // Exclude raw audio buffers for clean portable JSON save
    const sessionData = {
      ...session,
      tracks: session.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => ({
          ...c,
          buffer: undefined, // omitted from JSON
        })),
        takes: t.takes.map(tk => ({
          ...tk,
          buffer: undefined,
        })),
      })),
    };

    const json = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.name.replace(/[^a-zA-Z0-9]/g, '_')}_Session.studiopolo`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load session from JSON file
  const handleLoadSessionFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loaded = JSON.parse(event.target?.result as string);
        onUpdateSession(() => loaded);
        onClose();
      } catch (err) {
        alert('Invalid session file format.');
      }
    };
    reader.readAsText(file);
  };

  const templates = [
    {
      id: 'synthwave',
      title: 'Neon Horizons (Synthwave/Pop)',
      description: 'Full 6-track production with punchy 808s, analog bass, arp lead, lush pad, and vocal takes.',
      bpm: 120,
    },
    {
      id: 'rock',
      title: 'Indie Rock Band Session',
      description: 'Acoustic drums, tube bass, rhythm & lead guitars with amp simulators, and lead vocals.',
      bpm: 132,
    },
    {
      id: 'vocalpop',
      title: 'Modern Vocal Pop Session',
      description: 'Heavy vocal processing, auto-tune pitch correction, multi-take comping lanes, and 808 beat.',
      bpm: 105,
    },
    {
      id: 'clean',
      title: 'Clean Slate Studio',
      description: 'Empty session ready for live multi-track tracking from scratch.',
      bpm: 120,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#171822] border border-[#2b2d3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 border-b border-[#252735] flex items-center justify-between bg-[#14151c]">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Project & Session Management</h2>
              <p className="text-[11px] text-neutral-400">
                Templates, session save/load, and low-latency audio hardware settings
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

        {/* Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[75vh]">
          {/* Quick Session Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleSaveSession}
              className="p-4 bg-[#121319] hover:bg-[#191b24] border border-[#242634] hover:border-blue-500 rounded-xl flex items-center gap-3 transition-colors text-left"
            >
              <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Save Project Session</div>
                <div className="text-[10px] text-neutral-400">Download .studioforge project file</div>
              </div>
            </button>

            <label className="p-4 bg-[#121319] hover:bg-[#191b24] border border-[#242634] hover:border-blue-500 rounded-xl flex items-center gap-3 transition-colors text-left cursor-pointer">
              <input
                type="file"
                accept=".studioforge,.json"
                onChange={handleLoadSessionFile}
                className="hidden"
              />
              <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-lg">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Open Project File</div>
                <div className="text-[10px] text-neutral-400">Load existing session from disk</div>
              </div>
            </label>
          </div>

          {/* Session Templates */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Studio Session Templates
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => {
                    onLoadTemplate(tpl.id);
                    onClose();
                  }}
                  className="p-3 bg-[#121319] hover:bg-[#1a1c26] border border-[#242634] hover:border-blue-400 rounded-xl cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-white flex items-center justify-between">
                      <span>{tpl.title}</span>
                      <span className="font-mono text-[10px] text-blue-400">{tpl.bpm} BPM</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                      {tpl.description}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-blue-400">
                    <Sparkles className="w-3 h-3" />
                    <span>Load Template</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audio Engine Hardware & Latency Configuration */}
          <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Audio Hardware Buffer & Low-Latency Engine</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { size: 128, label: '128 Samples', latency: '2.7 ms (Ultra Low)' },
                { size: 256, label: '256 Samples', latency: '5.3 ms (Optimal Tracking)' },
                { size: 512, label: '512 Samples', latency: '10.6 ms (Safe Mixing)' },
              ].map((b) => (
                <button
                  key={b.size}
                  onClick={() => setBufferSize(b.size)}
                  className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                    bufferSize === b.size
                      ? 'bg-emerald-600/20 border-emerald-500 text-white'
                      : 'bg-[#181922] border-[#252735] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">{b.label}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">{b.latency}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-[#252735] bg-[#14151c] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
