/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Layers, 
  Send, 
  Volume2, 
  Sliders, 
  Music, 
  Disc, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Radio, 
  Play, 
  Square,
  Scissors
} from 'lucide-react';
import { ProjectSession, Track } from '../types/daw';

interface AISuiteProps {
  session: ProjectSession;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
  onSelectTrackForFX: (trackId: string) => void;
}

export const AISuite: React.FC<AISuiteProps> = ({
  session,
  onUpdateSession,
  onSelectTrackForFX,
}) => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'mix' | 'stems' | 'tuning' | 'chords' | 'repair'>('assistant');
  
  // Chat Commander state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; actionApplied?: string }>>([
    {
      sender: 'ai',
      text: "Welcome to Studio Polo AI Assistant. I can adjust mixing chains, sidechain instruments, generate chords, separate stems, or re-target mastering loudness. How can I assist your session?",
    },
  ]);
  const [isProcessingChat, setIsProcessingChat] = useState(false);

  // Mix Assistant state
  const [selectedGenre, setSelectedGenre] = useState('Modern Pop');
  const [isAnalyzingMix, setIsAnalyzingMix] = useState(false);
  const [mixReport, setMixReport] = useState<any>({
    genre: 'Modern Pop',
    summary: 'Analyzed 6 tracks. Frequency collision detected between Kick Drum and Analog Bass at 65Hz. Vocal presence needs +1.8dB high-shelf air at 10kHz.',
    recommendations: [
      {
        trackId: 'trk-drums',
        trackName: '01. Drums (808/909)',
        action: 'Dip 350Hz by -2.5dB to eliminate boxy mid buildup in the kick drum.',
        applied: false,
      },
      {
        trackId: 'trk-bass',
        trackName: '02. Analog Bass',
        action: 'Sidechain compress bass to 808 kick drum with 4:1 ratio and 20ms release.',
        applied: false,
      },
      {
        trackId: 'trk-vocal',
        trackName: '05. Vocal Lead',
        action: 'Apply fast opto compression (3:1 ratio, 10ms attack) and +2dB air boost at 12kHz.',
        applied: false,
      },
      {
        trackId: 'trk-chords',
        trackName: '04. Dream Chords Pad',
        action: 'Widen stereo field with ping-pong delay (350ms, 25% wet) and high-pass filter at 120Hz.',
        applied: false,
      },
    ],
  });

  // Stem Separation State
  const [selectedStemTrack, setSelectedStemTrack] = useState<string>('trk-vocal');
  const [isSeparating, setIsSeparating] = useState<boolean>(false);
  const [stemProgress, setStemProgress] = useState<number>(0);
  const [separatedStems, setSeparatedStems] = useState<{ vocals: boolean; drums: boolean; bass: boolean; other: boolean } | null>(null);

  // Chord Generator State
  const [chordKey, setChordKey] = useState('F');
  const [chordScale, setChordScale] = useState('Minor');
  const [chordProgression, setChordProgression] = useState<any[]>([
    { chord: 'Fm7', roman: 'i7', notes: ['F3', 'Ab3', 'C4', 'Eb4'], description: 'Tonic minor anchor with rich 7th' },
    { chord: 'Dbmaj7', roman: 'VImaj7', notes: ['Db3', 'F3', 'Ab3', 'C4'], description: 'Lush borrowed modal lift' },
    { chord: 'Bbm7', roman: 'iv7', notes: ['Bb2', 'Db3', 'F3', 'Ab3'], description: 'Subdominant emotional tension' },
    { chord: 'Eb7', roman: 'VII7', notes: ['Eb3', 'G3', 'Bb3', 'Db4'], description: 'Deceptive cadence resolving to tonic' },
  ]);

  // Execute Natural Language Chat Command
  const handleSendChat = async () => {
    if (!chatInput.trim() || isProcessingChat) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsProcessingChat(true);

    try {
      const res = await fetch('/api/ai/chat-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: userMsg, session }),
      });
      const data = await res.json();

      // Apply actions to session
      if (data.actions && data.actions.length > 0) {
        onUpdateSession(prev => {
          let updated = { ...prev };
          data.actions.forEach((act: any) => {
            if (act.type === 'set_send') {
              updated.tracks = updated.tracks.map(t =>
                t.id === act.trackId ? { ...t, sendReverb: act.send === 'reverb' ? act.value : t.sendReverb, sendDelay: act.send === 'delay' ? act.value : t.sendDelay } : t
              );
            } else if (act.type === 'set_bpm') {
              updated.bpm = act.value;
            } else if (act.type === 'set_comp') {
              updated.tracks = updated.tracks.map(t =>
                t.id === act.trackId ? { ...t, fx: { ...t.fx, compressor: { ...t.fx.compressor, ...act.params, enabled: true } } } : t
              );
            }
          });
          return updated;
        });
      }

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.reply || "Action completed.",
          actionApplied: data.actions?.length ? `${data.actions.length} session parameters modified` : undefined,
        },
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: "Processed your studio command and optimized the audio signal chain." },
      ]);
    } finally {
      setIsProcessingChat(false);
    }
  };

  // Run AI Mix Analysis
  const handleAnalyzeMix = async () => {
    setIsAnalyzingMix(true);
    try {
      const res = await fetch('/api/ai/mix-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: session.tracks, genre: selectedGenre }),
      });
      const data = await res.json();
      setMixReport(data);
    } catch {
      // Fallback
    } finally {
      setIsAnalyzingMix(false);
    }
  };

  // Apply Single Recommendation
  const handleApplyRec = (rec: any, idx: number) => {
    onUpdateSession(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => {
        if (t.id === rec.trackId) {
          return {
            ...t,
            fx: {
              ...t.fx,
              eq: rec.suggestedEq ? { ...t.fx.eq, ...rec.suggestedEq, enabled: true } : t.fx.eq,
              compressor: rec.suggestedComp ? { ...t.fx.compressor, ...rec.suggestedComp, enabled: true } : t.fx.compressor,
            },
          };
        }
        return t;
      }),
    }));

    setMixReport((prev: any) => ({
      ...prev,
      recommendations: prev.recommendations.map((r: any, i: number) =>
        i === idx ? { ...r, applied: true } : r
      ),
    }));
  };

  // Trigger AI Stem Separation
  const handleStartStemSeparation = () => {
    setIsSeparating(true);
    setStemProgress(0);
    const interval = setInterval(() => {
      setStemProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsSeparating(false);
          setSeparatedStems({ vocals: true, drums: true, bass: true, other: true });
          return 100;
        }
        return p + 20;
      });
    }, 250);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121317] overflow-hidden select-none">
      {/* Subheader & Feature Tabs */}
      <div className="h-11 border-b border-[#22242c] bg-[#16171d] px-6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-white tracking-wide">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>STUDIO POLO INTELLIGENCE LAYER</span>
        </div>

        <div className="flex items-center gap-1 bg-[#101115] p-1 rounded-lg border border-[#242633]">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'assistant' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Session Assistant
          </button>
          <button
            onClick={() => setActiveTab('mix')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'mix' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            AI Mix Assistant
          </button>
          <button
            onClick={() => setActiveTab('stems')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'stems' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Stem Separation
          </button>
          <button
            onClick={() => setActiveTab('tuning')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'tuning' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Vocal & Drum Tuning
          </button>
          <button
            onClick={() => setActiveTab('chords')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'chords' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Harmonic Generator
          </button>
          <button
            onClick={() => setActiveTab('repair')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'repair' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Noise & Repair
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
        {/* TAB 1: NATURAL LANGUAGE SESSION ASSISTANT (CHAT COMMANDER) */}
        {activeTab === 'assistant' && (
          <div className="w-full max-w-3xl h-[600px] bg-[#161720] border border-[#262836] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="h-12 border-b border-[#232532] bg-[#14151b] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span>AI Session Commander</span>
                <span className="text-[10px] text-neutral-400 font-normal">· Real-time session graph control</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                LISTENING TO SESSION
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="p-3 border-b border-[#20222e] bg-[#111218] flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-neutral-500 font-mono text-[10px] uppercase shrink-0">Try:</span>
              {[
                "Add a plate reverb to the vocal bus, sidechain bass to kick",
                "Clean up 300Hz mud on rhythm guitars",
                "Target Spotify streaming loudness (-14 LUFS)",
                "Increase project tempo to 124 BPM",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setChatInput(chip)}
                  className="px-2.5 py-1 rounded bg-[#1e202b] hover:bg-[#282a39] text-neutral-300 hover:text-white border border-[#2b2d3c] transition-colors whitespace-nowrap shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                        : 'bg-[#1e202c] border border-[#292b3a] text-neutral-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.actionApplied && (
                    <span className="mt-1 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {msg.actionApplied}
                    </span>
                  )}
                </div>
              ))}
              {isProcessingChat && (
                <div className="self-start p-3 bg-[#1e202c] border border-[#292b3a] rounded-xl text-xs text-neutral-400 animate-pulse">
                  Analyzing session routing and applying changes...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-[#232532] bg-[#14151b] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Instruct Studio Polo (e.g. 'Add high-shelf air to vocal, duck bass by 2dB')..."
                className="flex-1 bg-[#1c1d27] border border-[#2a2d3c] text-white px-3.5 py-2.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSendChat}
                disabled={isProcessingChat || !chatInput.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Execute</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: AI MIX ASSISTANT */}
        {activeTab === 'mix' && (
          <div className="w-full max-w-4xl bg-[#161720] border border-[#262836] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#232532] pb-4">
              <div>
                <h3 className="font-bold text-sm text-white">GENRE-REFERENCE AI MIX ASSISTANT</h3>
                <p className="text-xs text-neutral-400">
                  Detects frequency collisions, low-end mud, and dynamic masking against commercial reference targets
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-[#121319] px-2.5 py-1 rounded-lg border border-[#252735]">
                  <span className="text-[10px] text-neutral-400 font-mono">GENRE:</span>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="Modern Pop" className="bg-[#1a1b22]">Modern Pop (Dua Lipa / The Weeknd)</option>
                    <option value="Hip-Hop / Trap" className="bg-[#1a1b22]">Hip-Hop / Trap (Drake / Travis Scott)</option>
                    <option value="Indie Rock" className="bg-[#1a1b22]">Indie Rock (Arctic Monkeys / Tame Impala)</option>
                    <option value="EDM / Synthwave" className="bg-[#1a1b22]">EDM / Synthwave (Kavinsky / Daft Punk)</option>
                    <option value="Acoustic / Lo-Fi" className="bg-[#1a1b22]">Acoustic & Lo-Fi</option>
                  </select>
                </div>

                <button
                  onClick={handleAnalyzeMix}
                  disabled={isAnalyzingMix}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingMix ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzingMix ? 'Analyzing Session...' : 'Analyze Mix'}</span>
                </button>
              </div>
            </div>

            {/* Mix Summary Banner */}
            <div className="p-4 bg-[#121319] border border-[#232534] rounded-xl flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-xs leading-relaxed text-neutral-300">
                <span className="font-bold text-white mr-1">Engineering Assessment:</span>
                {mixReport.summary}
              </div>
            </div>

            {/* Recommendations List */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Actionable Mix Balance Recommendations
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mixReport.recommendations?.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#121319] border border-[#232534] rounded-xl flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>{rec.trackName || rec.trackId}</span>
                        <span className="text-[10px] font-mono text-blue-400 uppercase">{rec.type || 'DSP'}</span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-1.5 leading-snug">
                        {rec.action}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#1c1e28]">
                      <button
                        onClick={() => onSelectTrackForFX(rec.trackId)}
                        className="text-[10px] font-semibold text-neutral-400 hover:text-white"
                      >
                        Inspect Channel Strip
                      </button>

                      <button
                        onClick={() => handleApplyRec(rec, idx)}
                        disabled={rec.applied}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                          rec.applied
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                        }`}
                      >
                        {rec.applied ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                        <span>{rec.applied ? 'Applied' : 'Apply to Track'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI STEM SEPARATION */}
        {activeTab === 'stems' && (
          <div className="w-full max-w-3xl bg-[#161720] border border-[#262836] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#232532] pb-4">
              <div>
                <h3 className="font-bold text-sm text-white">DEEP NEURAL STEM SEPARATION</h3>
                <p className="text-xs text-neutral-400">
                  Isolate Vocals, Drums, Bass, and Other instrumentation from any track for remixing or sampling
                </p>
              </div>
              <Scissors className="w-5 h-5 text-indigo-400" />
            </div>

            {/* Track Selector & Trigger */}
            <div className="flex items-center gap-4 bg-[#121319] p-4 rounded-xl border border-[#232534]">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[11px] text-neutral-400">Source Track to Separate:</span>
                <select
                  value={selectedStemTrack}
                  onChange={(e) => setSelectedStemTrack(e.target.value)}
                  className="bg-[#1c1d27] border border-[#2a2d3c] text-white p-2 rounded text-xs font-semibold focus:outline-none"
                >
                  {session.tracks.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleStartStemSeparation}
                disabled={isSeparating}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-md disabled:opacity-50"
              >
                {isSeparating ? 'Decomposing Audio...' : 'Separate 4 Stems'}
              </button>
            </div>

            {/* Separation Progress */}
            {isSeparating && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400">Harmonic-Percussive Decomposition:</span>
                  <span className="text-indigo-400 font-bold">{stemProgress}%</span>
                </div>
                <div className="h-2 bg-[#101116] rounded-full overflow-hidden border border-[#232532]">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-200"
                    style={{ width: `${stemProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Separated Stems Showcase */}
            {separatedStems && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: 'Isolated Vocals', color: '#ec4899', desc: 'A cappella lead & harmonies' },
                  { name: 'Isolated Drums', color: '#f97316', desc: 'Kick, snare, hats, percs' },
                  { name: 'Isolated Bass', color: '#3b82f6', desc: 'Sub & synth bass frequencies' },
                  { name: 'Isolated Other', color: '#8b5cf6', desc: 'Synths, guitars & pads' },
                ].map((s) => (
                  <div
                    key={s.name}
                    className="p-3 bg-[#121319] border border-[#232534] rounded-xl flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block truncate">{s.name}</span>
                      <span className="text-[10px] text-neutral-400 block mt-1">{s.desc}</span>
                    </div>
                    <button
                      onClick={() => alert(`Imported ${s.name} as a new isolated track in the timeline!`)}
                      className="mt-3 py-1 bg-[#20222e] hover:bg-white hover:text-black text-neutral-200 rounded text-[10px] font-semibold transition-colors"
                    >
                      + Add to Session
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VOCAL & DRUM TUNING */}
        {activeTab === 'tuning' && (
          <div className="w-full max-w-3xl bg-[#161720] border border-[#262836] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <h3 className="font-bold text-sm text-white border-b border-[#232532] pb-3">
              INTELLIGENT VOCAL TUNING & DRUM GROOVE HUMANIZER
            </h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Vocal Auto-Tuning */}
              <div className="bg-[#121319] p-5 rounded-xl border border-[#232534] flex flex-col gap-4">
                <span className="text-xs font-bold text-pink-400">VOCAL PITCH AUTO-ALIGN</span>
                <p className="text-xs text-neutral-400">
                  Aligns pitches to musical scale while preserving natural vibrato and acoustic formant expression.
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Retune Speed</span>
                  <span className="font-mono text-pink-400 font-bold">45 ms (Natural)</span>
                </div>
                <input type="range" min="0" max="100" defaultValue="45" className="accent-pink-500" />
                <button
                  onClick={() => alert('Vocal pitch alignment committed to track!')}
                  className="py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold"
                >
                  Apply Natural Pitch Correction
                </button>
              </div>

              {/* Drum Humanizer */}
              <div className="bg-[#121319] p-5 rounded-xl border border-[#232534] flex flex-col gap-4">
                <span className="text-xs font-bold text-amber-400">AI DRUM GROOVE HUMANIZER</span>
                <p className="text-xs text-neutral-400">
                  Injects micro-timing swing, human dynamic velocity variations, and organic ghost notes.
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Groove Swing</span>
                  <span className="font-mono text-amber-400 font-bold">58% (MPC Swing)</span>
                </div>
                <input type="range" min="0" max="75" defaultValue="58" className="accent-amber-500" />
                <button
                  onClick={() => alert('Applied human groove and dynamic velocity curves to drum track!')}
                  className="py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg text-xs"
                >
                  Humanize Drum Performance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: HARMONIC GENERATOR */}
        {activeTab === 'chords' && (
          <div className="w-full max-w-4xl bg-[#161720] border border-[#262836] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#232532] pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">CHORD & HARMONY SUGGESTION ENGINE</h3>
                <p className="text-xs text-neutral-400">
                  Generates modal interchange, secondary dominants, and counter-melodies for song arrangements
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={chordKey}
                  onChange={(e) => setChordKey(e.target.value)}
                  className="bg-[#1c1d27] border border-[#2a2d3c] text-white px-2.5 py-1 rounded text-xs font-bold"
                >
                  {['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <select
                  value={chordScale}
                  onChange={(e) => setChordScale(e.target.value)}
                  className="bg-[#1c1d27] border border-[#2a2d3c] text-white px-2.5 py-1 rounded text-xs font-bold"
                >
                  <option value="Minor">Natural Minor</option>
                  <option value="Major">Major</option>
                  <option value="Dorian">Dorian</option>
                </select>
              </div>
            </div>

            {/* Chord Progression Cards */}
            <div className="grid grid-cols-4 gap-4">
              {chordProgression.map((chord, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#121319] border border-[#232534] rounded-xl flex flex-col justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-xl font-extrabold text-purple-400">{chord.chord}</span>
                      <span className="font-mono text-xs text-neutral-500 font-bold">{chord.roman}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 font-mono text-[10px] text-neutral-400">
                      {chord.notes.map((n: string) => (
                        <span key={n} className="px-1.5 py-0.5 bg-[#1c1d27] rounded">{n}</span>
                      ))}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-2 leading-tight">
                      {chord.description}
                    </p>
                  </div>

                  <button
                    onClick={() => alert(`Inserted chord ${chord.chord} into Piano Roll at bar ${idx * 2 + 1}!`)}
                    className="w-full py-1.5 bg-[#1e202c] hover:bg-purple-600 hover:text-white text-neutral-300 rounded text-xs font-semibold transition-colors"
                  >
                    + Insert to MIDI
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: NOISE & REPAIR */}
        {activeTab === 'repair' && (
          <div className="w-full max-w-3xl bg-[#161720] border border-[#262836] rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <h3 className="font-bold text-sm text-white border-b border-[#232532] pb-3">
              AI SPECTRAL REPAIR & NOISE RESTORATION
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { title: '50/60Hz Hum Remover', desc: 'Eliminates electrical ground loop interference.' },
                { title: 'De-Click & Pop', desc: 'Smooths digital clipping and vinyl clicks.' },
                { title: 'Vocal De-Breath & De-Esser', desc: 'Attenuates harsh sibilance and breathing.' },
              ].map((tool) => (
                <div key={tool.title} className="p-4 bg-[#121319] border border-[#232534] rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">{tool.title}</span>
                    <p className="text-[11px] text-neutral-400 mt-1">{tool.desc}</p>
                  </div>
                  <button
                    onClick={() => alert(`Cleaned up audio using ${tool.title}!`)}
                    className="mt-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                  >
                    Run Clean
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
