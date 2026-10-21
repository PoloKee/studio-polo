/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Music, 
  Play, 
  Trash2, 
  Sparkles, 
  Sliders, 
  Grid, 
  Zap,
  Volume2
} from 'lucide-react';
import { MidiNote, ProjectSession } from '../types/daw';
import { audioEngine } from '../audio/AudioEngine';

interface PianoRollProps {
  session: ProjectSession;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const PianoRoll: React.FC<PianoRollProps> = ({ session, onUpdateSession }) => {
  // Octaves 2 to 5 (Pitches 36 to 83)
  const minPitch = 48; // C3
  const maxPitch = 72; // C5
  const pitches: number[] = [];
  for (let p = maxPitch; p >= minPitch; p--) {
    pitches.push(p);
  }

  const totalBeats = 16;
  const [notes, setNotes] = useState<MidiNote[]>([
    { id: 'n-1', pitch: 65, start: 0, duration: 1, velocity: 100 }, // F4
    { id: 'n-2', pitch: 69, start: 1, duration: 1, velocity: 95 },  // A4
    { id: 'n-3', pitch: 72, start: 2, duration: 1.5, velocity: 105 }, // C5
    { id: 'n-4', pitch: 69, start: 3.5, duration: 0.5, velocity: 90 }, // A4
    { id: 'n-5', pitch: 67, start: 4, duration: 1, velocity: 98 }, // G4
    { id: 'n-6', pitch: 65, start: 5, duration: 1, velocity: 92 }, // F4
    { id: 'n-7', pitch: 69, start: 6, duration: 2, velocity: 102 }, // A4
    { id: 'n-8', pitch: 62, start: 8, duration: 1.5, velocity: 100 }, // D4
    { id: 'n-9', pitch: 65, start: 9.5, duration: 0.5, velocity: 90 }, // F4
    { id: 'n-10', pitch: 69, start: 10, duration: 1, velocity: 95 }, // A4
    { id: 'n-11', pitch: 67, start: 11, duration: 1, velocity: 92 }, // G4
    { id: 'n-12', pitch: 65, start: 12, duration: 3, velocity: 108 }, // F4
  ]);

  const [activePitch, setActivePitch] = useState<number | null>(null);

  // Play sound on key press
  const handleKeyAudition = (pitch: number) => {
    if (audioEngine.synth) {
      audioEngine.synth.noteOn(pitch, 100);
      setActivePitch(pitch);
    }
  };

  const handleKeyRelease = (pitch: number) => {
    if (audioEngine.synth) {
      audioEngine.synth.noteOff(pitch);
      setActivePitch(null);
    }
  };

  // Add note on grid click
  const handleGridClick = (pitch: number, beat: number) => {
    // Check if a note already exists here
    const existing = notes.find(n => n.pitch === pitch && Math.abs(n.start - beat) < 0.25);
    if (existing) {
      // Delete note
      setNotes(prev => prev.filter(n => n.id !== existing.id));
    } else {
      // Add note
      const newNote: MidiNote = {
        id: `note-${Date.now()}`,
        pitch,
        start: beat,
        duration: 1,
        velocity: 100,
      };
      setNotes(prev => [...prev, newNote]);
      handleKeyAudition(pitch);
      setTimeout(() => handleKeyRelease(pitch), 250);
    }
  };

  // Quantize Notes
  const handleQuantize = (gridSize: number = 0.5) => {
    setNotes(prev =>
      prev.map(n => ({
        ...n,
        start: Math.round(n.start / gridSize) * gridSize,
        duration: Math.max(gridSize, Math.round(n.duration / gridSize) * gridSize),
      }))
    );
  };

  // Humanize (subtle timing & velocity variation)
  const handleHumanize = () => {
    setNotes(prev =>
      prev.map(n => ({
        ...n,
        start: Math.max(0, n.start + (Math.random() * 0.08 - 0.04)),
        velocity: Math.max(40, Math.min(127, Math.round(n.velocity + (Math.random() * 16 - 8)))),
      }))
    );
  };

  // Chord Generator
  const handleInsertChord = (rootPitch: number = 65, chordType: 'major' | 'minor' | '7th') => {
    const intervals = chordType === 'major' ? [0, 4, 7] : chordType === 'minor' ? [0, 3, 7] : [0, 4, 7, 10];
    const newNotes: MidiNote[] = intervals.map(semitone => ({
      id: `chord-${Date.now()}-${semitone}`,
      pitch: rootPitch + semitone,
      start: 0,
      duration: 4,
      velocity: 95,
    }));
    setNotes(prev => [...prev, ...newNotes]);
  };

  // Play preview melody
  const handlePreviewMelody = () => {
    notes.forEach(note => {
      const beatSec = 60 / session.bpm;
      const startTime = note.start * beatSec * 1000;
      const durTime = note.duration * beatSec * 1000;

      setTimeout(() => {
        if (audioEngine.synth) {
          audioEngine.synth.noteOn(note.pitch, note.velocity);
          setTimeout(() => {
            audioEngine.synth?.noteOff(note.pitch);
          }, durTime);
        }
      }, startTime);
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121317] overflow-hidden select-none">
      {/* Piano Roll Toolbar */}
      <div className="h-10 border-b border-[#22242c] bg-[#16171d] px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
            <Music className="w-4 h-4 text-purple-400" />
            <span>POLYPHONIC MIDI PIANO ROLL</span>
          </div>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400 font-mono text-[11px]">Grid: 1/16 Note</span>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviewMelody}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 rounded transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Audition Pattern</span>
          </button>

          <button
            onClick={() => handleQuantize(0.5)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-[#22242e] hover:bg-[#2c2f3d] border border-[#2e313d] rounded transition-colors"
          >
            <Grid className="w-3.5 h-3.5 text-blue-400" />
            <span>Quantize (1/8)</span>
          </button>

          <button
            onClick={handleHumanize}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-[#22242e] hover:bg-[#2c2f3d] border border-[#2e313d] rounded transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Humanize</span>
          </button>

          <button
            onClick={() => handleInsertChord(65, 'major')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-[#22242e] hover:bg-[#2c2f3d] border border-[#2e313d] rounded transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>+ Chord (F Maj)</span>
          </button>

          <button
            onClick={() => setNotes([])}
            className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-[#252733] rounded transition-colors"
            title="Clear All"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Piano Roll Layout (Keyboard on Left, Grid on Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Piano Keys Column */}
        <div className="w-24 border-r border-[#22242c] bg-[#14151b] flex flex-col shrink-0 overflow-y-auto">
          {pitches.map((pitch) => {
            const noteIndex = pitch % 12;
            const isBlackKey = [1, 3, 6, 8, 10].includes(noteIndex);
            const noteName = `${PITCH_NAMES[noteIndex]}${Math.floor(pitch / 12) - 1}`;
            const isPlaying = activePitch === pitch;

            return (
              <div
                key={pitch}
                onMouseDown={() => handleKeyAudition(pitch)}
                onMouseUp={() => handleKeyRelease(pitch)}
                onMouseLeave={() => handleKeyRelease(pitch)}
                className={`h-7 px-2 flex items-center justify-between border-b cursor-pointer transition-colors ${
                  isBlackKey
                    ? isPlaying
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1b1c24] text-neutral-400 border-[#121318] hover:bg-[#252733]'
                    : isPlaying
                    ? 'bg-blue-500 text-white'
                    : 'bg-[#2a2c38] text-neutral-200 border-[#1c1d25] hover:bg-[#343644]'
                }`}
              >
                <span className="font-mono text-[10px] font-semibold">{noteName}</span>
                {noteName.startsWith('C') && !isBlackKey && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </div>
            );
          })}
        </div>

        {/* Right Note Grid Canvas */}
        <div className="flex-1 flex flex-col overflow-auto bg-[#0f1015] relative">
          {/* Top Beat Ruler */}
          <div className="h-6 border-b border-[#22242c] bg-[#15161d] flex sticky top-0 z-10">
            {Array.from({ length: totalBeats }).map((_, beat) => (
              <div
                key={beat}
                className="w-16 shrink-0 border-l border-[#262833] pl-1 text-[10px] font-mono text-neutral-400"
              >
                {beat + 1}
              </div>
            ))}
          </div>

          {/* Grid Rows for each pitch */}
          <div className="flex flex-col relative">
            {pitches.map((pitch) => {
              const noteIndex = pitch % 12;
              const isBlackKey = [1, 3, 6, 8, 10].includes(noteIndex);

              return (
                <div
                  key={pitch}
                  className={`h-7 flex border-b ${
                    isBlackKey ? 'bg-[#121318] border-[#181922]' : 'bg-[#16171f] border-[#1f202b]'
                  }`}
                >
                  {Array.from({ length: totalBeats }).map((_, beat) => (
                    <div
                      key={beat}
                      onClick={() => handleGridClick(pitch, beat)}
                      className="w-16 shrink-0 border-l border-[#22242f]/40 hover:bg-blue-500/10 cursor-pointer transition-colors"
                    />
                  ))}
                </div>
              );
            })}

            {/* Rendered MIDI Note Blocks */}
            {notes.map((note) => {
              const pitchIndex = pitches.indexOf(note.pitch);
              if (pitchIndex === -1) return null;

              const top = pitchIndex * 28; // 28px per row
              const left = note.start * 64; // 64px per beat
              const width = Math.max(16, note.duration * 64 - 2);

              return (
                <div
                  key={note.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Click on note deletes it
                    setNotes(prev => prev.filter(n => n.id !== note.id));
                  }}
                  className="absolute h-6 rounded bg-purple-600 border border-purple-400 shadow-md flex items-center px-1.5 cursor-pointer hover:bg-purple-500 transition-colors z-20 group"
                  style={{
                    top: `${top + 1}px`,
                    left: `${left}px`,
                    width: `${width}px`,
                  }}
                >
                  <span className="font-mono text-[9px] font-bold text-white truncate pointer-events-none">
                    Vel {note.velocity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
