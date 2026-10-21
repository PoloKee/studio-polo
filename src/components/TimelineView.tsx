/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  Volume2, 
  Mic, 
  Music, 
  Layers, 
  Plus, 
  Scissors, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  ChevronsDown, 
  ChevronsUp,
  Sliders,
  Check,
  Disc
} from 'lucide-react';
import { AudioClip, ProjectSession, Track, VocalTake } from '../types/daw';
import { createDefaultFXParams, createDefaultSpatialParams } from '../audio/defaultSession';

interface TimelineViewProps {
  session: ProjectSession;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
  onSelectTrackForFX: (trackId: string) => void;
  onOpenCompingModal: (track: Track) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  session,
  currentTime,
  isPlaying,
  onSeek,
  onUpdateSession,
  onSelectTrackForFX,
  onOpenCompingModal,
}) => {
  const [zoom, setZoom] = useState(48); // pixels per second
  const [activeTool, setActiveTool] = useState<'pointer' | 'cut' | 'erase'>('pointer');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [expandedTakeTracks, setExpandedTakeTracks] = useState<Set<string>>(new Set(['trk-vocal']));
  const [showStoryMode, setShowStoryMode] = useState<boolean>(true);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Time calculations
  const secondsPerBeat = 60 / session.bpm;
  const secondsPerBar = secondsPerBeat * session.timeSignature[0];
  const totalBars = 16;
  const totalSeconds = totalBars * secondsPerBar;
  const timelineWidth = Math.max(1200, totalSeconds * zoom);

  // Playhead position
  const playheadX = currentTime * zoom;

  // Toggle take lanes expansion
  const toggleTakeLanes = (trackId: string) => {
    setExpandedTakeTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  // Add new track
  const handleAddTrack = (type: 'audio' | 'instrument') => {
    const newId = `trk-${Date.now()}`;
    const newTrack: Track = {
      id: newId,
      name: `${type === 'audio' ? 'Audio Track' : 'Instrument Track'} ${session.tracks.length + 1}`,
      type,
      color: type === 'audio' ? '#06b6d4' : '#a855f7',
      icon: type === 'audio' ? 'mic' : 'music',
      volume: 0,
      pan: 0,
      muted: false,
      soloed: false,
      armed: false,
      phaseInvert: false,
      inputMonitor: false,
      gainTrim: 0,
      sendReverb: 0.15,
      sendDelay: 0.1,
      fx: createDefaultFXParams(),
      spatial: createDefaultSpatialParams(0, 0, 0),
      clips: [],
      midiClips: [],
      takes: [],
      meterPeakL: 0,
      meterPeakR: 0,
      gainReduction: 0,
    };
    onUpdateSession(prev => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
  };

  // Split clip at playhead
  const handleSplitClip = (trackId: string, clipId: string) => {
    onUpdateSession(prev => {
      const track = prev.tracks.find(t => t.id === trackId);
      if (!track) return prev;
      const clip = track.clips.find(c => c.id === clipId);
      if (!clip) return prev;

      // Check if playhead is within clip
      if (currentTime <= clip.start || currentTime >= clip.start + clip.duration) {
        return prev;
      }

      const splitTimeInClip = currentTime - clip.start;
      const firstDuration = splitTimeInClip;
      const secondDuration = clip.duration - splitTimeInClip;

      const clipA: AudioClip = {
        ...clip,
        id: `${clip.id}-a`,
        duration: firstDuration,
      };

      const clipB: AudioClip = {
        ...clip,
        id: `${clip.id}-b`,
        start: currentTime,
        duration: secondDuration,
        offset: clip.offset + splitTimeInClip,
      };

      const updatedClips = track.clips
        .filter(c => c.id !== clipId)
        .concat([clipA, clipB]);

      return {
        ...prev,
        tracks: prev.tracks.map(t => (t.id === trackId ? { ...t, clips: updatedClips } : t)),
      };
    });
  };

  // Delete clip
  const handleDeleteClip = (trackId: string, clipId: string) => {
    onUpdateSession(prev => ({
      ...prev,
      tracks: prev.tracks.map(t =>
        t.id === trackId ? { ...t, clips: t.clips.filter(c => c.id !== clipId) } : t
      ),
    }));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121317] overflow-hidden select-none">
      {/* Timeline Toolbar */}
      <div className="h-10 border-b border-[#22242c] bg-[#16171d] px-4 flex items-center justify-between text-xs">
        {/* Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTool('pointer')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTool === 'pointer'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-[#232530]'
            }`}
          >
            Pointer
          </button>
          <button
            onClick={() => setActiveTool('cut')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
              activeTool === 'cut'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-[#232530]'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split Tool</span>
          </button>
          <button
            onClick={() => setActiveTool('erase')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
              activeTool === 'erase'
                ? 'bg-rose-600 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-[#232530]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Erase</span>
          </button>
        </div>

        {/* Section Markers Display */}
        <div className="hidden md:flex items-center gap-2">
          {session.markers.map(m => (
            <button
              key={m.id}
              onClick={() => onSeek(m.time)}
              className="px-2 py-0.5 rounded text-[11px] font-medium transition-colors bg-[#20222a] hover:bg-[#2a2c36] text-neutral-300 hover:text-white border border-[#2d303b]"
            >
              <span className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ backgroundColor: m.color }} />
              {m.name}
            </button>
          ))}
        </div>

        {/* Zoom & Add Track */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#1a1c22] border border-[#262832] rounded p-0.5">
            <button
              onClick={() => setZoom(Math.max(20, zoom - 8))}
              title="Zoom Out"
              className="p-1 text-neutral-400 hover:text-white rounded"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] text-neutral-400 px-1">{zoom}px/s</span>
            <button
              onClick={() => setZoom(Math.min(120, zoom + 8))}
              title="Zoom In"
              className="p-1 text-neutral-400 hover:text-white rounded"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowStoryMode(!showStoryMode)}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors border ${
              showStoryMode
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                : 'bg-[#20222a] text-neutral-400 hover:text-white border-[#2d303b]'
            }`}
          >
            Story & Lyrics
          </button>

          <button
            onClick={() => handleAddTrack('audio')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-200 bg-[#22242e] hover:bg-[#2b2e3a] border border-[#2e313d] rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Track</span>
          </button>
        </div>
      </div>

      {/* Main Multi-track Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Headers Column (Fixed Width) */}
        <div className="w-72 border-r border-[#22242c] bg-[#14151b] flex flex-col shrink-0 overflow-y-auto">
          {/* Top ruler header spacer */}
          <div className="h-8 border-b border-[#22242c] bg-[#16171d] px-3 flex items-center justify-between text-[11px] text-neutral-400 font-semibold">
            <span>TRACK LIST</span>
            <span>CONTROLS</span>
          </div>

          {/* Track Headers */}
          <div className="flex-1 flex flex-col">
            {session.tracks.map((track) => {
              const isVocalWithTakes = track.takes && track.takes.length > 0;
              const isExpanded = expandedTakeTracks.has(track.id);

              return (
                <div key={track.id} className="border-b border-[#20222a] bg-[#15161c]">
                  {/* Master Track Strip */}
                  <div className="h-24 p-2.5 flex flex-col justify-between relative hover:bg-[#191a22] transition-colors">
                    {/* Color bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5"
                      style={{ backgroundColor: track.color }}
                    />

                    {/* Row 1: Name, Type Icon, FX Button */}
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-xs text-neutral-200 truncate">
                          {track.name}
                        </span>
                      </div>
                      <button
                        onClick={() => onSelectTrackForFX(track.id)}
                        title="Open Track FX Rack"
                        className="p-1 text-neutral-400 hover:text-white hover:bg-[#252732] rounded"
                      >
                        <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                    </div>

                    {/* Row 2: Arm, Monitor, Solo, Mute, Phase */}
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex items-center gap-1">
                        {/* Record Arm */}
                        <button
                          onClick={() => {
                            onUpdateSession(prev => ({
                              ...prev,
                              tracks: prev.tracks.map(t =>
                                t.id === track.id ? { ...t, armed: !t.armed } : t
                              ),
                            }));
                          }}
                          className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                            track.armed
                              ? 'bg-rose-600 text-white'
                              : 'bg-[#20222b] text-neutral-400 hover:text-neutral-200'
                          }`}
                          title="Record Arm"
                        >
                          R
                        </button>

                        {/* Input Monitor */}
                        <button
                          onClick={() => {
                            onUpdateSession(prev => ({
                              ...prev,
                              tracks: prev.tracks.map(t =>
                                t.id === track.id ? { ...t, inputMonitor: !t.inputMonitor } : t
                              ),
                            }));
                          }}
                          className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                            track.inputMonitor
                              ? 'bg-amber-500 text-black'
                              : 'bg-[#20222b] text-neutral-400 hover:text-neutral-200'
                          }`}
                          title="Input Monitor"
                        >
                          I
                        </button>

                        {/* Solo */}
                        <button
                          onClick={() => {
                            onUpdateSession(prev => ({
                              ...prev,
                              tracks: prev.tracks.map(t =>
                                t.id === track.id ? { ...t, soloed: !t.soloed } : t
                              ),
                            }));
                          }}
                          className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                            track.soloed
                              ? 'bg-blue-600 text-white'
                              : 'bg-[#20222b] text-neutral-400 hover:text-neutral-200'
                          }`}
                          title="Solo"
                        >
                          S
                        </button>

                        {/* Mute */}
                        <button
                          onClick={() => {
                            onUpdateSession(prev => ({
                              ...prev,
                              tracks: prev.tracks.map(t =>
                                t.id === track.id ? { ...t, muted: !t.muted } : t
                              ),
                            }));
                          }}
                          className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                            track.muted
                              ? 'bg-amber-600 text-white'
                              : 'bg-[#20222b] text-neutral-400 hover:text-neutral-200'
                          }`}
                          title="Mute"
                        >
                          M
                        </button>

                        {/* Phase Invert */}
                        <button
                          onClick={() => {
                            onUpdateSession(prev => ({
                              ...prev,
                              tracks: prev.tracks.map(t =>
                                t.id === track.id ? { ...t, phaseInvert: !t.phaseInvert } : t
                              ),
                            }));
                          }}
                          className={`w-5 h-5 rounded text-[10px] font-mono flex items-center justify-center transition-colors ${
                            track.phaseInvert
                              ? 'bg-purple-600 text-white'
                              : 'bg-[#20222b] text-neutral-400 hover:text-neutral-200'
                          }`}
                          title="Phase Invert (Ø)"
                        >
                          Ø
                        </button>
                      </div>

                      {/* Take Lanes Toggle */}
                      {isVocalWithTakes && (
                        <button
                          onClick={() => toggleTakeLanes(track.id)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            isExpanded ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'text-neutral-400 hover:bg-[#20222b]'
                          }`}
                          title="Expand Vocal Takes & Comping"
                        >
                          <span>Takes ({track.takes.length})</span>
                          {isExpanded ? <ChevronsUp className="w-3 h-3" /> : <ChevronsDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Row 3: Volume & Pan Sliders */}
                    <div className="flex items-center gap-2 pl-2 text-[10px]">
                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-neutral-500 font-mono">VOL</span>
                        <input
                          type="range"
                          min="-40"
                          max="6"
                          step="0.5"
                          value={track.volume}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            onUpdateSession(prev => ({
                              ...prev,
                              tracks: prev.tracks.map(t =>
                                t.id === track.id ? { ...t, volume: val } : t
                              ),
                            }));
                          }}
                          className="flex-1 h-1.5 bg-[#252731] rounded appearance-none cursor-pointer"
                        />
                        <span className="font-mono text-neutral-400 w-8 text-right">
                          {track.volume > 0 ? `+${track.volume.toFixed(0)}` : track.volume.toFixed(0)}dB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-rows for Take Comping Lanes if expanded */}
                  {isExpanded && isVocalWithTakes && (
                    <div className="border-t border-[#1f2129] bg-[#101115] pl-4 divide-y divide-[#1c1d25]">
                      {track.takes.map((take) => (
                        <div key={take.id} className="h-14 px-2 py-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-pink-400">
                              {take.name}
                            </span>
                            {take.isComped && (
                              <span className="text-[9px] px-1 bg-pink-500/20 text-pink-300 rounded border border-pink-500/30">
                                COMP ACTIVE
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => onOpenCompingModal(track)}
                            className="text-[10px] px-2 py-1 bg-[#20222c] hover:bg-pink-600 hover:text-white text-neutral-300 rounded transition-colors"
                          >
                            Comp Tool
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Timeline Canvas (Scrollable) */}
        <div ref={timelineContainerRef} className="flex-1 flex flex-col overflow-x-auto relative">
          {/* Story Mode / Lyrics Track */}
          {showStoryMode && (
            <div
              className="h-9 border-b border-[#242634] bg-[#101117] relative overflow-hidden"
              style={{ width: `${timelineWidth}px` }}
            >
              {session.markers.map((marker, idx) => {
                const nextMarker = session.markers[idx + 1];
                const startX = marker.time * zoom;
                const width = nextMarker
                  ? (nextMarker.time - marker.time) * zoom
                  : (totalSeconds - marker.time) * zoom;

                return (
                  <div
                    key={marker.id}
                    className="absolute top-1 bottom-1 rounded bg-[#171924] border border-[#26283b] px-2 py-0.5 flex flex-col justify-between overflow-hidden cursor-pointer hover:border-purple-400 transition-colors"
                    style={{ left: `${startX}px`, width: `${Math.max(60, width - 4)}px` }}
                    onClick={() => onSeek(marker.time)}
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono leading-none">
                      <span className="font-bold text-white truncate">{marker.name} · {marker.chords}</span>
                    </div>
                    <span className="text-[10px] text-purple-300 italic truncate font-sans leading-none">
                      {marker.lyrics || marker.notes}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top Bars Ruler */}
          <div
            className="h-8 border-b border-[#22242c] bg-[#16171d] relative cursor-pointer"
            style={{ width: `${timelineWidth}px` }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const seekTime = Math.max(0, clickX / zoom);
              onSeek(seekTime);
            }}
          >
            {/* Bar Numbers and Tick marks */}
            {Array.from({ length: totalBars }).map((_, i) => {
              const barLeft = i * secondsPerBar * zoom;
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-[#2e313d] pl-1.5 pt-1 text-[10px] font-mono font-medium text-neutral-400"
                  style={{ left: `${barLeft}px` }}
                >
                  {i + 1}
                </div>
              );
            })}

            {/* Loop Region Highlight */}
            {session.loopEnabled && (
              <div
                className="absolute top-0 bottom-0 bg-blue-500/15 border-x-2 border-blue-500 pointer-events-none"
                style={{
                  left: `${session.loopStart * zoom}px`,
                  width: `${(session.loopEnd - session.loopStart) * zoom}px`,
                }}
              />
            )}
          </div>

          {/* Track Lanes Canvas */}
          <div className="relative flex-1" style={{ width: `${timelineWidth}px` }}>
            {/* Background Grid Lines */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: totalBars * 4 }).map((_, beatIdx) => {
                const beatLeft = beatIdx * secondsPerBeat * zoom;
                const isBarLine = beatIdx % session.timeSignature[0] === 0;
                return (
                  <div
                    key={beatIdx}
                    className={`absolute top-0 bottom-0 ${
                      isBarLine ? 'border-l border-[#252731]' : 'border-l border-[#1a1b22]'
                    }`}
                    style={{ left: `${beatLeft}px` }}
                  />
                );
              })}
            </div>

            {/* Track Lanes */}
            <div className="relative z-10 flex flex-col">
              {session.tracks.map((track) => {
                const isVocalWithTakes = track.takes && track.takes.length > 0;
                const isExpanded = expandedTakeTracks.has(track.id);

                return (
                  <div key={track.id} className="border-b border-[#20222a] bg-[#121318]/50">
                    {/* Main Track Lane */}
                    <div className="h-24 relative p-1.5 flex items-center">
                      {track.clips.map((clip) => {
                        const clipLeft = clip.start * zoom;
                        const clipWidth = clip.duration * zoom;
                        const isSelected = selectedClipId === clip.id;

                        return (
                          <div
                            key={clip.id}
                            onClick={() => {
                              if (activeTool === 'cut') {
                                handleSplitClip(track.id, clip.id);
                              } else if (activeTool === 'erase') {
                                handleDeleteClip(track.id, clip.id);
                              } else {
                                setSelectedClipId(clip.id);
                              }
                            }}
                            className={`absolute top-1 bottom-1 rounded border shadow-sm cursor-pointer transition-all overflow-hidden flex flex-col justify-between ${
                              isSelected
                                ? 'ring-2 ring-white border-white bg-[#222533]'
                                : 'border-[#2d303f] bg-[#1a1c26] hover:border-neutral-400'
                            }`}
                            style={{
                              left: `${clipLeft}px`,
                              width: `${clipWidth}px`,
                            }}
                          >
                            {/* Clip Header */}
                            <div
                              className="h-4 px-1.5 flex items-center justify-between text-[10px] font-semibold text-white truncate"
                              style={{ backgroundColor: `${track.color}cc` }}
                            >
                              <span className="truncate">{clip.name}</span>
                              <span className="font-mono text-[9px] opacity-80">{clip.duration.toFixed(1)}s</span>
                            </div>

                            {/* Waveform Canvas Representation */}
                            <div className="flex-1 w-full px-1 py-0.5 flex items-center">
                              {clip.waveformData ? (
                                <svg
                                  className="w-full h-full opacity-90"
                                  viewBox={`0 0 ${clip.waveformData.length} 40`}
                                  preserveAspectRatio="none"
                                >
                                  {clip.waveformData.map((peak, idx) => {
                                    const height = Math.max(2, peak * 36);
                                    const y = (40 - height) / 2;
                                    return (
                                      <line
                                        key={idx}
                                        x1={idx}
                                        y1={y}
                                        x2={idx}
                                        y2={y + height}
                                        stroke={track.color}
                                        strokeWidth="0.8"
                                      />
                                    );
                                  })}
                                </svg>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500 font-mono">
                                  MIDI Event Region
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Sub-lane previews for Take Comping */}
                    {isExpanded && isVocalWithTakes && (
                      <div className="divide-y divide-[#1c1d25] bg-[#0d0e12]">
                        {track.takes.map((take) => (
                          <div key={take.id} className="h-14 relative flex items-center px-1">
                            {/* Render Take Waveform */}
                            <div
                              className="absolute top-1 bottom-1 rounded border border-[#2a2c38] bg-[#161720] overflow-hidden"
                              style={{
                                left: `0px`,
                                width: `${take.duration * zoom}px`,
                              }}
                            >
                              <div className="absolute top-0 left-0 right-0 h-3 px-1 text-[9px] font-mono text-pink-400 bg-pink-950/40 truncate">
                                {take.name}
                              </div>
                              <div className="h-full pt-3 px-1 flex items-center">
                                <svg
                                  className="w-full h-full opacity-70"
                                  viewBox={`0 0 ${take.waveformData.length} 24`}
                                  preserveAspectRatio="none"
                                >
                                  {take.waveformData.map((peak, idx) => {
                                    const height = Math.max(1, peak * 22);
                                    const y = (24 - height) / 2;
                                    return (
                                      <line
                                        key={idx}
                                        x1={idx}
                                        y1={y}
                                        x2={idx}
                                        y2={y + height}
                                        stroke="#f472b6"
                                        strokeWidth="0.8"
                                      />
                                    );
                                  })}
                                </svg>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Playhead Vertical Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
              style={{
                left: `${playheadX}px`,
                boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)',
              }}
            >
              {/* Playhead Head Marker */}
              <div className="w-3 h-3 -ml-[5px] -mt-2 bg-rose-500 rotate-45" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
