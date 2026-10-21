/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Headphones, 
  Radio, 
  Box, 
  Layers, 
  Download, 
  Volume2, 
  Sliders, 
  Sparkles,
  Move3d,
  Maximize2
} from 'lucide-react';
import { ProjectSession, Track } from '../types/daw';

interface SpatialAudioViewProps {
  session: ProjectSession;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
}

export const SpatialAudioView: React.FC<SpatialAudioViewProps> = ({
  session,
  onUpdateSession,
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(session.tracks[0]?.id || 'trk-drums');
  const [binauralMode, setBinauralMode] = useState<boolean>(true);
  const [format, setFormat] = useState<'7.1.4' | '5.1' | 'Binaural'>('7.1.4');

  const currentTrack = session.tracks.find(t => t.id === selectedTrackId) || session.tracks[0];
  const spatial = currentTrack.spatial;

  const updateSpatial = (updates: Partial<typeof spatial>) => {
    onUpdateSession(prev => ({
      ...prev,
      tracks: prev.tracks.map(t =>
        t.id === currentTrack.id ? { ...t, spatial: { ...t.spatial, ...updates } } : t
      ),
    }));
  };

  // 7.1.4 Channel Labels
  const channels714 = [
    { label: 'L', name: 'Left' },
    { label: 'C', name: 'Center' },
    { label: 'R', name: 'Right' },
    { label: 'LFE', name: 'Subwoofer' },
    { label: 'Lss', name: 'Left Side' },
    { label: 'Rss', name: 'Right Side' },
    { label: 'Lsr', name: 'Left Rear' },
    { label: 'Rsr', name: 'Right Rear' },
    { label: 'Tfl', name: 'Top Front L' },
    { label: 'Tfr', name: 'Top Front R' },
    { label: 'Trl', name: 'Top Rear L' },
    { label: 'Trr', name: 'Top Rear R' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#121317] overflow-hidden select-none">
      {/* Subheader */}
      <div className="h-11 border-b border-[#22242c] bg-[#16171d] px-6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-white tracking-wide">
          <Move3d className="w-4 h-4 text-indigo-400" />
          <span>DOLBY ATMOS & OBJECT-BASED 3D SPATIAL AUDIO</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400 font-mono">Format: {format}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Binaural Headphone Toggle */}
          <button
            onClick={() => setBinauralMode(!binauralMode)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              binauralMode
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-[#22242e] text-neutral-400 hover:text-white border border-[#2e313d]'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Binaural HRTF Monitoring ({binauralMode ? 'ON' : 'OFF'})</span>
          </button>

          <button
            onClick={() => alert('Spatial Audio ADM BWF package exported for Dolby Atmos & Apple Spatial Audio!')}
            className="flex items-center gap-1.5 px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Atmos Master</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col lg:flex-row gap-6">
        {/* Left: Interactive 3D Room Soundstage */}
        <div className="flex-1 bg-[#161720] border border-[#262836] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#232532] pb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              3D Object Positioning Soundstage (Top-Down & Elevation)
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              Sweet Spot: Center [0, 0, 0]
            </span>
          </div>

          {/* Interactive 3D Soundstage Canvas/SVG */}
          <div className="my-4 h-80 bg-[#0e0f14] rounded-xl border border-[#232534] relative overflow-hidden flex items-center justify-center">
            {/* Grid & Concentric Distance Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-72 rounded-full border border-[#222432] opacity-40" />
              <div className="w-52 h-52 rounded-full border border-[#222432] opacity-40" />
              <div className="w-28 h-28 rounded-full border border-[#222432] opacity-40" />
              <div className="w-full h-px bg-[#222432] opacity-30 absolute" />
              <div className="h-full w-px bg-[#222432] opacity-30 absolute" />
            </div>

            {/* Listener Icon in Center */}
            <div className="absolute z-10 w-9 h-9 rounded-full bg-blue-600/30 border border-blue-400 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
              <Headphones className="w-4 h-4 text-blue-300" />
            </div>

            {/* Placed Track Audio Objects */}
            {session.tracks.map((track) => {
              const isSelected = track.id === currentTrack.id;
              // Map -100..100 to canvas percentage
              const left = `calc(50% + ${(track.spatial.x / 100) * 40}%)`;
              const top = `calc(50% - ${(track.spatial.y / 100) * 40}%)`;

              return (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrackId(track.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform flex flex-col items-center z-20 group ${
                    isSelected ? 'scale-110 z-30' : 'hover:scale-105'
                  }`}
                  style={{ left, top }}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg transition-all ${
                      isSelected
                        ? 'ring-4 ring-white shadow-indigo-500/50'
                        : 'border border-white/40'
                    }`}
                    style={{ backgroundColor: track.color }}
                  >
                    {track.name.slice(0, 2)}
                  </div>
                  <span
                    className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap transition-colors ${
                      isSelected ? 'bg-white text-black font-bold' : 'bg-black/70 text-neutral-300'
                    }`}
                  >
                    {track.name} (Z:{track.spatial.z}%)
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Object Position Sliders */}
          <div className="grid grid-cols-3 gap-4 text-xs bg-[#121319] p-4 rounded-xl border border-[#232534]">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Azimuth X (Left/Right)</span>
                <span className="font-mono text-white font-bold">{spatial.x}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={spatial.x}
                onChange={(e) => updateSpatial({ x: Number(e.target.value) })}
                className="accent-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Distance Y (Front/Back)</span>
                <span className="font-mono text-white font-bold">{spatial.y}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={spatial.y}
                onChange={(e) => updateSpatial({ y: Number(e.target.value) })}
                className="accent-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Elevation Z (Height)</span>
                <span className="font-mono text-white font-bold">{spatial.z}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={spatial.z}
                onChange={(e) => updateSpatial({ z: Number(e.target.value) })}
                className="accent-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Right: Object Metadata & 7.1.4 Surround Bed Metering */}
        <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
          {/* Object Parameter Panel */}
          <div className="bg-[#161720] border border-[#262836] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#232532] pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Object Properties
              </span>
              <span className="font-bold text-xs" style={{ color: currentTrack.color }}>
                {currentTrack.name}
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Object Size / Diffusion</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={spatial.size}
                  onChange={(e) => updateSpatial({ size: Number(e.target.value) })}
                  className="w-32 accent-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Stereo Spread</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={spatial.spread}
                  onChange={(e) => updateSpatial({ spread: Number(e.target.value) })}
                  className="w-32 accent-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Atmos Bed Routing</span>
                <select className="bg-[#20222a] text-white p-1 rounded font-semibold text-xs">
                  <option>Object 3D (Direct)</option>
                  <option>Surround Bed 7.1.2</option>
                  <option>LFE Sub Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* 7.1.4 Surround Bed Meters */}
          <div className="bg-[#161720] border border-[#262836] rounded-2xl p-5 shadow-xl flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#232532] pb-2">
              7.1.4 Atmos Speaker Activity
            </span>

            <div className="grid grid-cols-6 gap-2">
              {channels714.map((ch) => (
                <div
                  key={ch.label}
                  className="bg-[#111218] p-2 rounded-lg border border-[#222432] flex flex-col items-center gap-1.5"
                >
                  <span className="font-mono text-[10px] font-bold text-neutral-400">{ch.label}</span>
                  <div className="w-2.5 h-16 bg-[#1a1c26] rounded-sm overflow-hidden flex flex-col justify-end">
                    <div
                      className="w-full bg-indigo-500 transition-all duration-100"
                      style={{ height: `${Math.random() * 50 + 20}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
