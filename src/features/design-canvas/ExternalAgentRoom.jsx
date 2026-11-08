import React, { useState } from 'react';
import {
  Terminal,
  FileCode2,
  FolderOpen,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Eye,
  ChevronDown,
  ChevronUp,
  Cpu,
  AlertCircle,
  Play,
  Layers,
} from 'lucide-react';

export default function ExternalAgentRoom({
  projectId,
  projectName,
  exchangeStatus,
  onOpenCanvas,
  onRefreshExchange,
}) {
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState(null);

  const inputPath =
    exchangeStatus?.inputPath ||
    `c:\\programming\\layora\\.layora\\projects\\${projectId}\\input_context.json`;
  const outputPath =
    exchangeStatus?.outputPath ||
    `c:\\programming\\layora\\.layora\\projects\\${projectId}\\design_output.json`;
  const relativeInput =
    exchangeStatus?.relativeInputPath || `.layora/projects/${projectId}/input_context.json`;
  const relativeOutput =
    exchangeStatus?.relativeOutputPath || `.layora/projects/${projectId}/design_output.json`;

  const inputContext = exchangeStatus?.inputContext;
  const isOutputReady = Boolean(exchangeStatus?.outputExists && exchangeStatus?.document);
  const nodeCount = exchangeStatus?.nodeCount || 0;

  const realAntigravityPrompt =
    exchangeStatus?.inputContext?.suggestedAntigravityPrompt ||
    `Halo Antigravity! Tolong baca spesifikasi proyek Layora di file ini:
${inputPath}

Berdasarkan konteks kode sumber di direktori ${exchangeStatus?.sourceRoot || 'proyek'}, buatkan desain UI/UX lengkap dalam format Layora Design Schema v1.0.0 (1 single master canvas berdimensi 1440 × 2600 px berisi semua section: Navbar, Hero, Telemetry, History Table, dan Admin), lalu simpan hasilnya langsung ke file output:
${outputPath}

Pastikan struktur JSON valid: { "schemaVersion": "1.0.0", "document": { "id": "doc_${projectId}", "name": "${projectName}", "viewport": { "width": 1440, "height": 2600 }, "background": "#F8FAFC", "children": [...] } }.`;

  const handleCopyInputPath = async () => {
    await navigator.clipboard.writeText(inputPath);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handleCopyOutputPath = async () => {
    await navigator.clipboard.writeText(outputPath);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(realAntigravityPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleSimulateAntigravity = async () => {
    setIsSimulating(true);
    setSimError(null);
    try {
      const res = await fetch(`/bridge/simulate-output/${projectId}`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`Simulation failed: ${res.statusText}`);
      }
      if (onRefreshExchange) {
        await onRefreshExchange();
      }
    } catch (err) {
      setSimError(err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-start overflow-y-auto bg-app p-6 md:p-10">
      <div className="w-full max-w-4xl space-y-6">
        {/* Top Header Card */}
        <div className="rounded-card border border-border bg-panel p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded bg-accent/10 px-2.5 py-1 text-meta font-semibold text-accent">
                <Terminal className="h-3.5 w-3.5" />
                <span>External AI Agent Session — Antigravity</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary">
                {projectName || 'Proyek Desain Layora'}
              </h1>
              <p className="text-secondary text-text-secondary">
                Layora Local Bridge aktif. File context untuk Antigravity telah diinisialisasi di folder proyek lokal Anda.
                {exchangeStatus?.sourceRoot && (
                  <span className="block mt-1 font-mono text-meta text-accent break-all">
                    Direktori Referensi: {exchangeStatus.sourceRoot}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefreshExchange}
                className="inline-flex items-center gap-1.5 rounded-control border border-border bg-panel px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                title="Periksa ulang file di disk"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Cek File</span>
              </button>

              {isOutputReady && (
                <button
                  type="button"
                  onClick={onOpenCanvas}
                  className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent-hover transition-colors animate-pulse"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Buka Kanvas Desain ({nodeCount} Node)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Connection & Live Watcher Status Banner */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded border border-border bg-app px-3.5 py-2.5 text-xs text-text-secondary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success"></span>
              </span>
              <span>
                <strong>Local Bridge:</strong> Terhubung di <code>http://127.0.0.1:3001</code>
              </span>
            </div>

            <div className="flex items-center gap-2.5 rounded border border-border bg-app px-3.5 py-2.5 text-xs text-text-secondary">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isOutputReady ? 'bg-success' : 'bg-warning animate-pulse'}`}></span>
              </span>
              <span>
                <strong>Status File Output:</strong>{' '}
                {isOutputReady ? (
                  <span className="font-semibold text-success">
                    Tervalidasi & Siap di Kanvas ({nodeCount} layer)
                  </span>
                ) : (
                  <span className="text-warning">Menunggu Antigravity menulis file...</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Exchange Files Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Box 1: File Input yang dibaca Antigravity */}
          <div className="rounded-card border border-border bg-panel p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-accent/10 text-accent">
                  <FileCode2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-text-primary">1. File Input (Context)</h3>
                  <span className="text-meta text-text-muted">Dibaca oleh Antigravity</span>
                </div>
              </div>
              <span className="rounded bg-success/15 px-2 py-0.5 text-meta font-medium text-success">
                Ready on Disk
              </span>
            </div>

            <div className="rounded border border-border bg-app p-2.5 space-y-1 font-mono text-meta">
              <div className="text-text-muted text-[11px]">Relative Path:</div>
              <div className="text-text-primary break-all">{relativeInput}</div>
              <div className="text-text-muted text-[11px] pt-1">Absolute Path:</div>
              <div className="text-text-secondary text-[11px] break-all">{inputPath}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyInputPath}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-control border border-border bg-panel py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {copiedInput ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedInput ? 'Path Tersalin!' : 'Salin Path File'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowJsonPreview(!showJsonPreview)}
                className="inline-flex items-center gap-1 rounded-control border border-border bg-panel px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{showJsonPreview ? 'Tutup' : 'Lihat Isi'}</span>
                {showJsonPreview ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {showJsonPreview && inputContext && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded border border-border bg-app p-2.5 font-mono text-[11px] text-text-secondary leading-relaxed">
                <pre>{JSON.stringify(inputContext, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Box 2: File Output yang ditulis Antigravity */}
          <div className="rounded-card border border-border bg-panel p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-accent/10 text-accent">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-text-primary">2. File Output (Canvas)</h3>
                  <span className="text-meta text-text-muted">Ditulis oleh Antigravity</span>
                </div>
              </div>

              <span
                className={`rounded px-2 py-0.5 text-meta font-medium ${
                  isOutputReady ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                }`}
              >
                {isOutputReady ? 'File Terisi' : 'Menunggu Output'}
              </span>
            </div>

            <div className="rounded border border-border bg-app p-2.5 space-y-1 font-mono text-meta">
              <div className="text-text-muted text-[11px]">Relative Path:</div>
              <div className="text-text-primary break-all">{relativeOutput}</div>
              <div className="text-text-muted text-[11px] pt-1">Absolute Path:</div>
              <div className="text-text-secondary text-[11px] break-all">{outputPath}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyOutputPath}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-control border border-border bg-panel py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {copiedOutput ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedOutput ? 'Path Tersalin!' : 'Salin Path File'}</span>
              </button>

              {isOutputReady && (
                <button
                  type="button"
                  onClick={onOpenCanvas}
                  className="inline-flex items-center gap-1.5 rounded-control bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Buka Kanvas</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Box 3: Langkah Prompt di Real Antigravity */}
        <div className="rounded-card border border-accent/40 bg-panel p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">
              Langkah Prompt ke Real Antigravity (VS Code / Antigravity IDE)
            </h2>
          </div>

          <p className="text-secondary text-text-secondary leading-relaxed">
            Buka room chat Antigravity Anda di VS Code / IDE, lalu salin dan kirim prompt berikut.
            Antigravity akan membaca file <code>input_context.json</code> dan menulis hasilnya ke <code>design_output.json</code>:
          </p>

          <div className="relative rounded-control border border-border bg-app p-4">
            <pre className="font-mono text-meta text-text-primary whitespace-pre-wrap leading-relaxed select-all">
              {realAntigravityPrompt}
            </pre>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-meta text-text-muted">
                Klik tombol di kanan untuk menyalin seluruh prompt ke clipboard
              </span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1.5 rounded-control bg-accent px-4 py-2 text-xs font-semibold text-white shadow hover:bg-accent-hover transition-colors"
              >
                {copiedPrompt ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedPrompt ? 'Prompt Berhasil Disalin!' : 'Salin Prompt untuk Antigravity'}</span>
              </button>
            </div>
          </div>

          <div className="rounded border border-border bg-panel-muted p-3.5 text-meta text-text-secondary leading-relaxed">
            <p>
              💡 <strong>Alur Revisi:</strong> Jika nanti Anda ingin merevisi warna, menambah komponen, atau mengubah layout, Anda cukup kirim prompt revisi di chat Antigravity IDE (misal: <em>"Antigravity, ubah warna background jadi slate-900 dan tambahkan grafik sensor di bawah kartu AQI"</em>). Antigravity akan mengupdate file <code>design_output.json</code>, dan Layora akan langsung me-refresh kanvas secara otomatis tanpa reload browser!
            </p>
          </div>
        </div>

        {/* Quick Simulator Test Card (Optional / Developer Convenience) */}
        <div className="rounded-card border border-border bg-panel p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-text-primary">
                Uji Coba Cepat (Simulasikan Output Antigravity)
              </h3>
              <p className="text-meta text-text-secondary">
                Ingin langsung melihat kanvas terisi sekarang? Klik tombol ini untuk menulis sample Layora Design Schema ke <code>design_output.json</code>.
              </p>
            </div>

            <button
              type="button"
              disabled={isSimulating}
              onClick={handleSimulateAntigravity}
              className="inline-flex items-center gap-1.5 rounded-control border border-accent bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent hover:bg-accent hover:text-white transition-colors shrink-0 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{isSimulating ? 'Menulis file...' : 'Tulis Output & Render Kanvas'}</span>
            </button>
          </div>

          {simError && (
            <div className="flex items-center gap-2 rounded border border-danger/40 bg-danger/10 p-2.5 text-meta text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{simError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
