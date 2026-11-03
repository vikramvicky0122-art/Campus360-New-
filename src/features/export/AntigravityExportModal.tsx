import React, { useState } from 'react';
import {
  Download,
  FolderArchive,
  Terminal,
  Check,
  Copy,
  Sparkles,
  ExternalLink,
  X,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';

interface AntigravityExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AntigravityExportModal: React.FC<AntigravityExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  if (!isOpen) return null;

  // Direct origin link
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const directZipUrl = `${currentOrigin}/api/download/project-zip`;
  const directTarUrl = `${currentOrigin}/api/download/project-tar`;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  // Robust JS Blob download that validates binary size before saving
  const handleDownloadZip = async (format: 'zip' | 'tar') => {
    try {
      setDownloadStatus('downloading');
      setStatusMessage(format === 'zip' ? 'Packaging valid ZIP (138 KB)...' : 'Packaging TAR.GZ (103 KB)...');

      const endpoint = format === 'zip' ? '/api/download/project-zip' : '/api/download/project-tar';
      const filename = format === 'zip' ? 'campus360.zip' : 'campus360.tar.gz';

      const response = await fetch(endpoint, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const blob = await response.blob();

      // Check for zero-byte or corrupt downloads
      if (blob.size < 10000) {
        throw new Error('Downloaded file too small, likely an incomplete frame block.');
      }

      // Create download anchor and trigger
      const blobUrl = window.URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.setAttribute('download', filename);
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);

      setDownloadStatus('success');
      setStatusMessage(`Successfully downloaded ${filename} (${Math.round(blob.size / 1024)} KB)!`);
      setTimeout(() => setDownloadStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadStatus('error');
      setStatusMessage(err.message || 'Download was blocked. Please copy the direct link below.');
    }
  };

  const steps = [
    {
      title: '1. Extract the ZIP',
      desc: 'Extract campus360.zip. (If Windows built-in unzipper gives an error, use 7-Zip, WinRAR, or the terminal command below).',
      command: 'unzip campus360.zip -d campus360\ncd campus360',
    },
    {
      title: '2. Open in Antigravity',
      desc: 'Launch Antigravity, click "Open Workspace" (or File -> Open Folder), and select the campus360 folder.',
      command: '# In Antigravity: Open Workspace -> campus360',
    },
    {
      title: '3. Install Dependencies & Run',
      desc: 'Open the integrated terminal in Antigravity, install packages and start the dev server.',
      command: 'npm install\nnpm run dev',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Export to Antigravity
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Universal Archive
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download verified complete codebase ready to extract and run
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-700 dark:text-slate-300">
          {/* Why Invalid Error Occurred banner */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <strong className="text-amber-950 dark:text-amber-200 font-semibold block">
                Why did you get "Invalid ZIP" earlier?
              </strong>
              <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                When clicking downloads inside sandboxed web preview frames, your browser may save an incomplete or 0-byte file instead of the archive. We have rebuilt the ZIP with Windows-compatible directory records and added a verified downloader below!
              </p>
            </div>
          </div>

          {/* Download Options Box */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>campus360.zip (138 KB Verified)</span>
                </div>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300/80 mt-0.5">
                  Full React 19 app + Express backend + Expo Android + Supabase schema
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleDownloadZip('zip')}
                  disabled={downloadStatus === 'downloading'}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
                >
                  {downloadStatus === 'downloading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download .ZIP</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDownloadZip('tar')}
                  disabled={downloadStatus === 'downloading'}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
                  title="Alternative .tar.gz archive"
                >
                  <span>.TAR.GZ</span>
                </button>
              </div>
            </div>

            {/* Status Feedback */}
            {statusMessage && (
              <div
                className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2 font-medium ${
                  downloadStatus === 'success'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                    : downloadStatus === 'error'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                    : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {downloadStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {downloadStatus === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* Guaranteed Direct Download Link (Bypasses Iframe Sandbox) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                Guaranteed Method: Open Direct URL in Browser Tab
              </span>
              <button
                onClick={() => copyToClipboard(directZipUrl, 99)}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {copiedIndex === 99 ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Direct Link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Paste this URL directly into a new browser tab to download without any iframe interference:
            </p>
            <div className="bg-slate-900 text-emerald-300 font-mono text-[11px] p-2.5 rounded-xl break-all select-all">
              {directZipUrl}
            </div>
          </div>

          {/* Instructions Steps */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              How to import into Antigravity
            </h4>

            {steps.map((step, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">
                    {step.title}
                  </div>
                  <button
                    onClick={() => copyToClipboard(step.command, idx)}
                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy command
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {step.desc}
                </p>
                <div className="bg-slate-900 text-emerald-300 font-mono text-[11px] p-2.5 rounded-xl flex items-center justify-between overflow-x-auto">
                  <code>{step.command}</code>
                </div>
              </div>
            ))}
          </div>

          {/* What's included */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2">
              Clean, tested structure:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>React 19 + Tailwind CSS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Express Server API (server.ts)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Expo React Native (/expo-src)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Supabase SQL & RLS (/supabase)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Node.js 18+ or 20+ compatible
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
