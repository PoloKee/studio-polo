/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Layers, 
  Plus, 
  Sparkles, 
  Radio, 
  Volume2, 
  FastForward,
  Check
} from 'lucide-react';
import { ClipLauncherScene, ProjectSession } from '../types/daw';

interface ClipLauncherProps {
  session: ProjectSession;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
  onCommitToTimeline: () => void;
}

export const ClipLauncher: React.FC<ClipLauncherProps> = ({
  session,
  onUpdateSession,
  onCommitToTimeline,
}) => {
  const [activeSceneId, setActiveSceneId] = useState<string>('scene-1');

  // Toggle individual clip playback
  const toggleClipSlot = (sceneId: string, trackId: string) => {
    onUpdateSession(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => {
        if (s.id === sceneId && s.trackSlots[trackId]) {
          const currentSlot = s.trackSlots[trackId];
          return {
            ...s,
            trackSlots: {
              ...s.trackSlots,
              [trackId]: {
                ...currentSlot,
                isPlaying: !currentSlot.isPlaying,
              },
            },
          };
        }
        return s;
      }),
    }));
  };

  // Launch entire Scene
  const handleLaunchScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    onUpdateSession(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => ({
        ...s,
        active: s.id === sceneId,
        trackSlots: Object.fromEntries(
          Object.entries(s.trackSlots).map(([trkId, slot]) => [
            trkId,
            { ...slot, isPlaying: s.id === sceneId },
          ])
        ),
      })),
    }));
  };

  // Stop all clips
  const handleStopAll = () => {
    onUpdateSession(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => ({
        ...s,
        active: false,
        trackSlots: Object.fromEntries(
          Object.entries(s.trackSlots).map(([trkId, slot]) => [
            trkId,
            { ...slot, isPlaying: false },
          ])
        ),
      })),
    }));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121317] overflow-hidden select-none">
      {/* Subheader */}
      <div className="h-11 border-b border-[#22242c] bg-[#16171d] px-6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-white tracking-wide">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>NON-LINEAR CLIP LAUNCHER (SESSION VIEW)</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">Tempo-Synced Matrix</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStopAll}
            className="px-3 py-1 bg-[#22242e] hover:bg-[#2c2e3a] text-neutral-300 hover:text-white border border-[#2e313d] rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop All Clips</span>
          </button>

          <button
            onClick={onCommitToTimeline}
            className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Record Performance to Linear Timeline</span>
          </button>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="inline-block min-w-full bg-[#161720] border border-[#262836] rounded-2xl p-6 shadow-2xl">
          {/* Track Headers Row */}
          <div className="flex items-center gap-3 pb-3 border-b border-[#232532]">
            {/* Spacer for Scene triggers */}
            <div className="w-40 font-bold text-xs text-neutral-400 uppercase tracking-wider shrink-0">
              SCENES
            </div>

            {/* Track Column Labels */}
            <div className="flex-1 flex gap-3">
              {session.tracks.map((track) => (
                <div
                  key={track.id}
                  className="w-36 h-8 px-2.5 rounded-lg flex items-center justify-between font-bold text-xs text-white truncate shadow-sm shrink-0"
                  style={{ backgroundColor: `${track.color}dd` }}
                >
                  <span className="truncate">{track.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scene Rows */}
          <div className="flex flex-col gap-3 pt-3">
            {session.scenes?.map((scene) => {
              const isSceneActive = activeSceneId === scene.id;

              return (
                <div key={scene.id} className="flex items-center gap-3">
                  {/* Master Scene Trigger Button */}
                  <button
                    onClick={() => handleLaunchScene(scene.id)}
                    className={`w-40 h-16 rounded-xl border flex items-center justify-between px-3 text-left transition-all shrink-0 ${
                      isSceneActive
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30 font-bold'
                        : 'bg-[#1e202c] border-[#2b2d3d] text-neutral-300 hover:bg-[#262838] hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-xs truncate">{scene.name}</span>
                      <span className="font-mono text-[10px] opacity-75">{scene.bpm} BPM</span>
                    </div>
                    <Play className={`w-4 h-4 shrink-0 ${isSceneActive ? 'fill-white' : 'fill-emerald-400'}`} />
                  </button>

                  {/* Track Clip Slots */}
                  <div className="flex-1 flex gap-3">
                    {session.tracks.map((track) => {
                      const slot = scene.trackSlots[track.id];
                      const isPlaying = slot?.isPlaying;

                      return (
                        <div
                          key={track.id}
                          onClick={() => toggleClipSlot(scene.id, track.id)}
                          className={`w-36 h-16 rounded-xl border cursor-pointer p-2.5 flex flex-col justify-between transition-all shrink-0 select-none ${
                            isPlaying
                              ? 'bg-[#222536] border-emerald-400 shadow-md ring-2 ring-emerald-500/50'
                              : 'bg-[#181924] border-[#252737] hover:border-neutral-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white truncate">
                              {slot?.clipName || 'Empty Slot'}
                            </span>
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${
                                isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
                              }`}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className={isPlaying ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                              {isPlaying ? 'PLAYING' : 'READY'}
                            </span>
                            {isPlaying ? (
                              <Square className="w-3 h-3 text-emerald-400 fill-current" />
                            ) : (
                              <Play className="w-3 h-3 text-neutral-400 fill-current" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
