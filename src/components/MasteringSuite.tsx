/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Disc, 
  Download, 
  Radio, 
  Activity, 
  Layers, 
  CheckCircle, 
  FileAudio, 
  Sliders, 
  Check, 
  Sparkles,
  Play
} from 'lucide-react';
import { AlbumSong, ProjectSession } from '../types/daw';
import { MeterData, audioEngine } from '../audio/AudioEngine';

interface MasteringSuiteProps {
  session: ProjectSession;
  meterData: MeterData | null;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
  onOpenExportModal: () => void;
}

export const MasteringSuite: React.FC<MasteringSuiteProps> = ({
  session,
  meterData,
  onUpdateSession,
  onOpenExportModal,
}) => {
  const [targetPreset, setTargetPreset] = useState<'streaming' | 'club' | 'broadcast'>('streaming');
  const [referencePlaying, setReferencePlaying] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const targets = {
    streaming: { name: 'Spotify / Apple Music', lufs: -14.0, peak: -1.0 },
    club: { name: 'Club / DJ Master (Loud)', lufs: -9.0, peak: -0.2 },
    broadcast: { name: 'EBU R128 Broadcast', lufs: -23.0, peak: -1.0 },
  };

  const currentTarget = targets[targetPreset];
  const currentLUFS = meterData ? meterData.lufs : -14.1;
  const lufsDelta = currentLUFS - currentTarget.lufs;

  // Export Master directly
  const handleDirectMasterExport = async () => {
    setIsExporting(true);
    try {
      const blob = await audioEngine.exportMasterMix(session, session.bitDepth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.name.replace(/[^a-zA-Z0-9]/g, '_')}_Master_${session.bitDepth}bit.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export master mix:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121317] overflow-hidden select-none">
      {/* Subheader */}
      <div className="h-10 border-b border-[#22242c] bg-[#16171d] px-6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-200 uppercase tracking-wider">
            MASTERING SUITE & ALBUM SEQUENCER
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">Release Compliance: ITU-R BS.1770-4</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setReferencePlaying(!referencePlaying)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              referencePlaying
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-[#22242e] text-neutral-300 hover:text-white border border-[#2e313d]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>A/B Reference ({referencePlaying ? 'AUDITIONING REF' : 'CURRENT MIX'})</span>
          </button>

          <button
            onClick={handleDirectMasterExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Rendering Master...' : 'Export 24-bit WAV'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Metering & Compliance on Top, Album Sequencer on Bottom */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
        {/* Section 1: Loudness & True Peak Compliance Console */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Box 1: Integrated LUFS Meter */}
          <div className="bg-[#171822] border border-[#2b2d3d] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#252735] pb-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Integrated Loudness (LUFS)
              </span>
              <span className="text-[10px] font-mono text-neutral-500">BS.1770</span>
            </div>

            <div className="py-4 flex flex-col items-center">
              <span className="font-mono text-5xl font-extrabold text-white tracking-tight tabular-nums">
                {currentLUFS.toFixed(1)}
              </span>
              <span className="text-xs font-medium text-neutral-400 mt-1">Target: {currentTarget.lufs} LUFS</span>
            </div>

            {/* Compliance Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="h-2 bg-[#0e0f14] rounded-full overflow-hidden border border-[#242634] flex">
                <div
                  className={`h-full transition-all duration-100 ${
                    Math.abs(lufsDelta) <= 1.0 ? 'bg-emerald-500' : lufsDelta > 1 ? 'bg-rose-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.max(10, Math.min(100, (currentLUFS + 40) * 2.5))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>Quiet (-30)</span>
                <span className={Math.abs(lufsDelta) <= 1.0 ? 'text-emerald-400 font-bold' : ''}>
                  {Math.abs(lufsDelta) <= 1.0 ? 'STREAMING COMPLIANT' : lufsDelta > 0 ? `+${lufsDelta.toFixed(1)} LU (Too Loud)` : `${lufsDelta.toFixed(1)} LU (Too Quiet)`}
                </span>
                <span>Loud (-6)</span>
              </div>
            </div>
          </div>

          {/* Box 2: True Peak dBFS */}
          <div className="bg-[#171822] border border-[#2b2d3d] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#252735] pb-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Maximum True Peak (dBTP)
              </span>
              <span className="text-[10px] font-mono text-neutral-500">4x Oversampled</span>
            </div>

            <div className="py-4 flex flex-col items-center">
              <span className="font-mono text-5xl font-extrabold text-emerald-400 tracking-tight tabular-nums">
                {meterData ? meterData.truePeak.toFixed(1) : '-0.3'}
              </span>
              <span className="text-xs font-medium text-neutral-400 mt-1">Ceiling: {currentTarget.peak} dBTP</span>
            </div>

            <div className="flex items-center justify-between text-xs bg-[#101116] px-3 py-2 rounded-lg border border-[#242634]">
              <span className="text-neutral-400">Inter-Sample Peak Margin</span>
              <span className="font-mono font-bold text-emerald-400">0.7 dB Headroom</span>
            </div>
          </div>

          {/* Box 3: Target Platform Selector */}
          <div className="bg-[#171822] border border-[#2b2d3d] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#252735] pb-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Distribution Target
              </span>
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            </div>

            <div className="flex flex-col gap-2 my-2">
              <button
                onClick={() => setTargetPreset('streaming')}
                className={`p-2.5 rounded-lg text-left border transition-all text-xs flex items-center justify-between ${
                  targetPreset === 'streaming'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-[#121319] border-[#242634] text-neutral-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-bold">Streaming Platforms</div>
                  <div className="text-[10px] text-neutral-400">Spotify, Apple, Tidal (-14 LUFS)</div>
                </div>
                {targetPreset === 'streaming' && <Check className="w-4 h-4 text-blue-400" />}
              </button>

              <button
                onClick={() => setTargetPreset('club')}
                className={`p-2.5 rounded-lg text-left border transition-all text-xs flex items-center justify-between ${
                  targetPreset === 'club'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-[#121319] border-[#242634] text-neutral-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-bold">Club & Dancefloor</div>
                  <div className="text-[10px] text-neutral-400">DJ release, maximum punch (-9 LUFS)</div>
                </div>
                {targetPreset === 'club' && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            </div>

            <button
              onClick={onOpenExportModal}
              className="w-full py-2 bg-[#22242f] hover:bg-[#2b2d3b] text-white rounded-lg text-xs font-semibold border border-[#2e313d] transition-colors"
            >
              Configure Release Codecs & Stems...
            </button>
          </div>
        </div>

        {/* Section 2: Album Tracklist & Sequencing Engine */}
        <div className="bg-[#171822] border border-[#2b2d3d] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#252735] pb-3">
            <div className="flex items-center gap-3">
              <Disc className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm text-white">
                  Album Tracklist: {session.album}
                </h3>
                <p className="text-xs text-neutral-400">
                  By {session.artist} · Red Book CD Gap Sequencing & ISRC Embedding
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const nextNum = session.albumSongs.length + 1;
                const newSong: AlbumSong = {
                  id: `song-${Date.now()}`,
                  trackNumber: nextNum,
                  title: `Untitled Track ${nextNum}`,
                  artist: session.artist,
                  duration: '3:30',
                  isrc: `US-SDF-26-0010${nextNum}`,
                  gapSeconds: 2.0,
                  loudnessLUFS: -14.0,
                  peakDb: -0.3,
                  status: 'Mixed',
                };
                onUpdateSession(prev => ({ ...prev, albumSongs: [...prev.albumSongs, newSong] }));
              }}
              className="px-3 py-1.5 bg-[#22242f] hover:bg-[#2b2d3b] text-neutral-200 hover:text-white border border-[#2e313d] rounded text-xs font-medium transition-colors"
            >
              + Add Track to Album
            </button>
          </div>

          {/* Songs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#252735] text-neutral-500 font-mono text-[11px]">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">TITLE</th>
                  <th className="py-2.5 px-3">ARTIST</th>
                  <th className="py-2.5 px-3">DURATION</th>
                  <th className="py-2.5 px-3">ISRC CODE</th>
                  <th className="py-2.5 px-3">CD GAP</th>
                  <th className="py-2.5 px-3">LUFS</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20222d]">
                {session.albumSongs.map((song) => (
                  <tr key={song.id} className="hover:bg-[#1c1d27] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-neutral-400">
                      {String(song.trackNumber).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {song.title}
                    </td>
                    <td className="py-3 px-3 text-neutral-400">
                      {song.artist}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-300">
                      {song.duration}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-400">
                      {song.isrc}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-400">
                      {song.gapSeconds.toFixed(1)}s
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400">
                      {song.loudnessLUFS.toFixed(1)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-800/50">
                        {song.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
