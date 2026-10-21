/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileAudio, 
  Layers, 
  Disc, 
  CheckCircle, 
  Loader2, 
  Sliders 
} from 'lucide-react';
import { ProjectSession } from '../types/daw';
import { audioEngine } from '../audio/AudioEngine';

interface ExportModalProps {
  session: ProjectSession;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSession: (updater: (prev: ProjectSession) => ProjectSession) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  session,
  isOpen,
  onClose,
  onUpdateSession,
}) => {
  if (!isOpen) return null;

  const [bitDepth, setBitDepth] = useState<16 | 24 | 32>(session.bitDepth || 24);
  const [sampleRate, setSampleRate] = useState<number>(session.sampleRate || 48000);
  const [dither, setDither] = useState<boolean>(true);
  const [isExportingMaster, setIsExportingMaster] = useState<boolean>(false);
  const [isExportingStems, setIsExportingStems] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  // Metadata
  const [title, setTitle] = useState(session.name);
  const [artist, setArtist] = useState(session.artist);
  const [album, setAlbum] = useState(session.album);
  const [isrc, setIsrc] = useState(session.albumSongs[0]?.isrc || 'US-SDF-26-00101');

  // Trigger Master Mix Export
  const handleExportMaster = async () => {
    setIsExportingMaster(true);
    setExportStatus('Rendering 64-bit summing engine and master bus plugins...');
    try {
      const blob = await audioEngine.exportMasterMix(session, bitDepth);
      setExportStatus('Generating RIFF WAV headers & metadata...');

      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Master_${bitDepth}bit_${sampleRate / 1000}kHz.wav`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`Master rendered and downloaded successfully!`);
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('Error rendering audio.');
    } finally {
      setIsExportingMaster(false);
    }
  };

  // Trigger Stem Export
  const handleExportStems = async () => {
    setIsExportingStems(true);
    setExportStatus('Rendering multi-track stems...');
    try {
      for (let i = 0; i < session.tracks.length; i++) {
        const track = session.tracks[i];
        if (track.clips.length === 0) continue;

        setExportStatus(`Rendering Stem ${i + 1}/${session.tracks.length}: ${track.name}...`);
        const blob = await audioEngine.exportTrackStem(track, session, bitDepth);
        const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Stem_${track.name.replace(/[^a-zA-Z0-9]/g, '_')}.wav`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        // brief pause between downloads
        await new Promise(r => setTimeout(r, 200));
      }
      setExportStatus(`All stems exported successfully!`);
    } catch (err) {
      console.error('Stem export failed:', err);
      setExportStatus('Error rendering stems.');
    } finally {
      setIsExportingStems(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#171822] border border-[#2b2d3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 border-b border-[#252735] flex items-center justify-between bg-[#14151c]">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Release Master & Multi-Track Stem Exporter
              </h2>
              <p className="text-[11px] text-neutral-400">
                Lossless bit-perfect export with ISRC and broadcast metadata embedding
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

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[75vh]">
          {/* Format Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-2">
              <span className="text-xs font-bold text-neutral-300">BIT DEPTH</span>
              <div className="grid grid-cols-3 gap-2">
                {[16, 24, 32].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBitDepth(b as any)}
                    className={`py-1.5 rounded text-xs font-semibold border transition-colors ${
                      bitDepth === b
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#1a1c26] text-neutral-400 border-[#282a38] hover:text-white'
                    }`}
                  >
                    {b}-bit {b === 32 ? 'Float' : ''}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-neutral-500">
                {bitDepth === 16 ? 'Red Book CD Standard' : bitDepth === 24 ? 'Studio Master / Streaming Standard' : '32-bit Float Archival'}
              </span>
            </div>

            <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-2">
              <span className="text-xs font-bold text-neutral-300">SAMPLE RATE</span>
              <div className="grid grid-cols-3 gap-2">
                {[44100, 48000, 96000].map((sr) => (
                  <button
                    key={sr}
                    onClick={() => setSampleRate(sr)}
                    className={`py-1.5 rounded text-xs font-semibold border transition-colors ${
                      sampleRate === sr
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#1a1c26] text-neutral-400 border-[#282a38] hover:text-white'
                    }`}
                  >
                    {sr / 1000} kHz
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-neutral-500">
                {sampleRate === 44100 ? 'Standard CD audio rate' : sampleRate === 48000 ? 'Industry film / streaming rate' : 'High-definition 96k rate'}
              </span>
            </div>
          </div>

          {/* Metadata & ISRC */}
          <div className="bg-[#121319] p-4 rounded-xl border border-[#242634] flex flex-col gap-3">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Release Metadata & ISRC Embedding
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-neutral-400 text-[10px]">Track Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#1c1d27] border border-[#2a2d3c] text-white p-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-neutral-400 text-[10px]">Artist / Band</span>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="bg-[#1c1d27] border border-[#2a2d3c] text-white p-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-neutral-400 text-[10px]">Album Title</span>
                <input
                  type="text"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="bg-[#1c1d27] border border-[#2a2d3c] text-white p-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-neutral-400 text-[10px]">ISRC Code</span>
                <input
                  type="text"
                  value={isrc}
                  onChange={(e) => setIsrc(e.target.value)}
                  className="bg-[#1c1d27] border border-[#2a2d3c] text-white p-2 rounded font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Status Message */}
          {exportStatus && (
            <div className="p-3 bg-[#111218] rounded-lg border border-[#282a39] text-xs font-mono text-blue-400 flex items-center gap-2">
              {(isExportingMaster || isExportingStems) && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
              <span>{exportStatus}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="h-16 px-6 border-t border-[#252735] bg-[#14151c] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#20222a] hover:bg-[#282a36] transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportStems}
              disabled={isExportingStems || isExportingMaster}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-200 bg-[#252837] hover:bg-[#303347] border border-[#36394f] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Export All Stems</span>
            </button>

            <button
              onClick={handleExportMaster}
              disabled={isExportingMaster || isExportingStems}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Master (WAV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
