/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectSession, DAWView, Track, AudioClip } from './types/daw';
import { audioEngine, MeterData } from './audio/AudioEngine';
import { createInitialSession } from './audio/defaultSession';
import { extractWaveformData } from './audio/AudioBufferUtils';
import { TopBar } from './components/TopBar';
import { TransportBar } from './components/TransportBar';
import { TimelineView } from './components/TimelineView';
import { MixerConsole } from './components/MixerConsole';
import { PianoRoll } from './components/PianoRoll';
import { DrumMachine } from './components/DrumMachine';
import { FXRack } from './components/FXRack';
import { MasteringSuite } from './components/MasteringSuite';
import { VocalCompingModal } from './components/VocalCompingModal';
import { ExportModal } from './components/ExportModal';
import { ProjectModal } from './components/ProjectModal';
import { SpatialAudioView } from './components/SpatialAudioView';
import { AISuite } from './components/AISuite';
import { ClipLauncher } from './components/ClipLauncher';
import { CommandPalette } from './components/CommandPalette';
import { createDefaultFXParams, createDefaultSpatialParams } from './audio/defaultSession';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<ProjectSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<DAWView>('timeline');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [meterData, setMeterData] = useState<MeterData | null>(null);
  const [trackPeaks, setTrackPeaks] = useState<Map<string, { l: number; r: number }>>(new Map());
  const [selectedTrackId, setSelectedTrackId] = useState<string>('trk-drums');

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [compingModalTrack, setCompingModalTrack] = useState<Track | null>(null);

  // Undo / Redo History Stack
  const historyRef = useRef<ProjectSession[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);

  // Update session with history recording
  const updateSession = useCallback((updater: (prev: ProjectSession) => ProjectSession) => {
    setSession(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      if (!isUndoRedoRef.current) {
        const nextIndex = historyIndexRef.current + 1;
        historyRef.current = historyRef.current.slice(0, nextIndex).concat([next]);
        historyIndexRef.current = nextIndex;
      }
      isUndoRedoRef.current = false;
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current -= 1;
      const prevSession = historyRef.current[historyIndexRef.current];
      setSession(prevSession);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current += 1;
      const nextSession = historyRef.current[historyIndexRef.current];
      setSession(nextSession);
    }
  }, []);

  // Initialize AudioEngine & Demo Session
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await audioEngine.init();
        const ctx = audioEngine.getContext();
        if (ctx && mounted) {
          const initSession = await createInitialSession(ctx);
          if (mounted) {
            setSession(initSession);
            setSelectedTrackId(initSession.tracks[0]?.id || 'trk-drums');
            historyRef.current = [initSession];
            historyIndexRef.current = 0;
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to initialize AudioEngine:', err);
        setIsLoading(false);
      }
    };

    init();

    // Set engine metering and tick callbacks
    audioEngine.setCallbacks(
      (time) => {
        if (mounted) setCurrentTime(time);
      },
      (master, trkPeaks) => {
        if (mounted) {
          setMeterData(master);
          setTrackPeaks(trkPeaks);
        }
      }
    );

    // Recording complete handler
    audioEngine.setOnRecordingComplete((trackId, buffer) => {
      if (!mounted) return;
      const waveform = extractWaveformData(buffer, 100);
      const newClip: AudioClip = {
        id: `rec-${Date.now()}`,
        trackId,
        name: `Live Recording (${new Date().toLocaleTimeString()})`,
        start: 0,
        duration: buffer.duration,
        offset: 0,
        buffer,
        waveformData: waveform,
        gain: 0,
        fadeIn: 0.05,
        fadeOut: 0.1,
        pitchShift: 0,
        isMuted: false,
      };

      updateSession(prev => ({
        ...prev,
        tracks: prev.tracks.map(t =>
          t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
        ),
      }));
    });

    return () => {
      mounted = false;
    };
  }, [updateSession]);

  // Sync metronome state
  useEffect(() => {
    if (session) {
      audioEngine.setMetronome(session.countInEnabled);
    }
  }, [session?.countInEnabled]);

  // Playback Handlers
  const handlePlay = () => {
    if (!session) return;
    audioEngine.play(session);
    setIsPlaying(true);
  };

  const handlePause = () => {
    audioEngine.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setIsRecording(false);
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    if (!session) return;
    audioEngine.seek(time, session);
    setCurrentTime(time);
  };

  const handleRecord = async () => {
    if (!session) return;
    if (isRecording) {
      audioEngine.stopRecording();
      setIsRecording(false);
      setIsPlaying(false);
    } else {
      // Find armed track or default to vocal
      const armedTrack = session.tracks.find(t => t.armed) || session.tracks.find(t => t.id === 'trk-vocal') || session.tracks[0];
      try {
        await audioEngine.startRecording(armedTrack.id, session);
        setIsRecording(true);
        setIsPlaying(true);
      } catch (err) {
        alert('Microphone permission required for multi-track recording.');
      }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) handlePause();
        else handlePlay();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        handleStop();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRecord();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        updateSession(prev => ({ ...prev, loopEnabled: !prev.loopEnabled }));
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        updateSession(prev => ({ ...prev, countInEnabled: !prev.countInEnabled }));
      } else if (e.key === '1') {
        setCurrentView('timeline');
      } else if (e.key === '2') {
        setCurrentView('mixer');
      } else if (e.key === '3') {
        setCurrentView('pianoroll');
      } else if (e.key === '4') {
        setCurrentView('drums');
      } else if (e.key === '5') {
        setCurrentView('fxrack');
      } else if (e.key === '6') {
        setCurrentView('mastering');
      } else if (e.key === '7') {
        setCurrentView('spatial');
      } else if (e.key === '8') {
        setCurrentView('aisuite');
      } else if (e.key === '9') {
        setCurrentView('cliplauncher');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isRecording, session, handleUndo, handleRedo, updateSession]);

  if (isLoading || !session) {
    return (
      <div className="h-screen w-screen bg-[#111216] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-extrabold text-lg shadow-lg shadow-indigo-600/30">
          SP
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-300">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>INITIALIZING STUDIO POLO AUDIO ENGINE & MULTI-TRACK BUSSES...</span>
        </div>
        <p className="text-xs text-neutral-500 font-mono">
          Loading AI Mix Assistant, Atmos 3D Panning, and 64-bit Summing Bus
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#121316] text-neutral-200 overflow-hidden">
      {/* 1. DAW Top Header */}
      <TopBar
        session={session}
        currentView={currentView}
        onViewChange={setCurrentView}
        onUpdateSession={updateSession}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndexRef.current > 0}
        canRedo={historyIndexRef.current < historyRef.current.length - 1}
      />

      {/* 2. Professional Transport Bar */}
      <TransportBar
        session={session}
        isPlaying={isPlaying}
        isRecording={isRecording}
        currentTime={currentTime}
        meterData={meterData}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onRecord={handleRecord}
        onSeek={handleSeek}
        onUpdateSession={updateSession}
      />

      {/* 3. Main Workspace Viewport */}
      <main className="flex-1 flex overflow-hidden">
        {currentView === 'timeline' && (
          <TimelineView
            session={session}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeek={handleSeek}
            onUpdateSession={updateSession}
            onSelectTrackForFX={(trackId) => {
              setSelectedTrackId(trackId);
              setCurrentView('fxrack');
            }}
            onOpenCompingModal={(track) => setCompingModalTrack(track)}
          />
        )}

        {currentView === 'mixer' && (
          <MixerConsole
            session={session}
            meterData={meterData}
            trackPeaks={trackPeaks}
            onUpdateSession={updateSession}
            onSelectTrackForFX={(trackId) => {
              setSelectedTrackId(trackId);
              setCurrentView('fxrack');
            }}
          />
        )}

        {currentView === 'pianoroll' && (
          <PianoRoll
            session={session}
            onUpdateSession={updateSession}
          />
        )}

        {currentView === 'drums' && (
          <DrumMachine />
        )}

        {currentView === 'fxrack' && (
          <FXRack
            session={session}
            selectedTrackId={selectedTrackId}
            onSelectTrack={setSelectedTrackId}
            onUpdateSession={updateSession}
          />
        )}

        {currentView === 'spatial' && (
          <SpatialAudioView
            session={session}
            onUpdateSession={updateSession}
          />
        )}

        {currentView === 'aisuite' && (
          <AISuite
            session={session}
            onUpdateSession={updateSession}
            onSelectTrackForFX={(trackId) => {
              setSelectedTrackId(trackId);
              setCurrentView('fxrack');
            }}
          />
        )}

        {currentView === 'cliplauncher' && (
          <ClipLauncher
            session={session}
            onUpdateSession={updateSession}
            onCommitToTimeline={() => setCurrentView('timeline')}
          />
        )}

        {currentView === 'mastering' && (
          <MasteringSuite
            session={session}
            meterData={meterData}
            onUpdateSession={updateSession}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />
        )}
      </main>

      {/* 4. Modals */}
      {compingModalTrack && (
        <VocalCompingModal
          track={compingModalTrack}
          isOpen={true}
          onClose={() => setCompingModalTrack(null)}
          onCommitComp={(trackId) => {
            // Updated in modal
          }}
        />
      )}

      {isExportModalOpen && (
        <ExportModal
          session={session}
          isOpen={true}
          onClose={() => setIsExportModalOpen(false)}
          onUpdateSession={updateSession}
        />
      )}

      {isProjectModalOpen && (
        <ProjectModal
          session={session}
          isOpen={true}
          onClose={() => setIsProjectModalOpen(false)}
          onUpdateSession={updateSession}
          onLoadTemplate={async (tplName) => {
            const ctx = audioEngine.getContext();
            if (ctx) {
              const fresh = await createInitialSession(ctx);
              fresh.name = tplName === 'rock' ? 'Midnight Transmission (Indie Rock)' : fresh.name;
              updateSession(() => fresh);
            }
          }}
        />
      )}

      {/* 5. VS Code Style Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectView={setCurrentView}
        onPlay={handlePlay}
        onStop={handleStop}
        onExport={() => setIsExportModalOpen(true)}
        onAddTrack={(type) => {
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
          updateSession(prev => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
        }}
        onUndo={handleUndo}
      />
    </div>
  );
}
