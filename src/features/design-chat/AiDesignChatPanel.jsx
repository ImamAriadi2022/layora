import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Check,
  X,
  Target,
  Layers,
  Loader2,
  Paperclip,
  Terminal,
  Copy,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { useAgentStore } from '../../stores/useAgentStore.js';
import { useReferenceStore } from '../../stores/useReferenceStore.js';
import { executeAgentRevision } from '../../services/agent-adapters/agentRegistry.js';
import {
  buildLayoraSystemPrompt,
  buildGenerationUserPrompt,
} from '../../services/ai-providers/schemaSynthesizer.js';
import { normalizeAndValidateSchema } from '../../core/validator/validator.js';

const QUICK_REVISIONS = [
  'Buatkan dashboard deteksi kualitas udara (AQI, PM2.5, CO2)',
  'Tambahkan tabel data di bawah metrik utama',
  'Ubah warna aksen menjadi biru tua',
  'Buat layout dan jarak kartu lebih compact',
  'Tambahkan search dan filter bar di bagian atas',
];

export default function AiDesignChatPanel({ onSwitchToAgentRoom, onManualRefreshExchange }) {
  const {
    projects,
    activeProjectId,
    activeDocument,
    selectedNodeId,
    getSelectedNode,
    chatMessages,
    appendChatMessage,
    pendingRevision,
    stageRevisionForReview,
    acceptPendingRevision,
    discardPendingRevision,
    commitDocumentUpdate,
    saveVersionSnapshot,
  } = useProjectStore();

  const { getActiveAgent } = useAgentStore();
  const { references } = useReferenceStore();

  const activeProj = projects.find((p) => p.id === activeProjectId);
  const isExternalAgent = activeProj?.executionMode === 'external';

  const [panelMode, setPanelMode] = useState(isExternalAgent ? 'external-sync' : 'chat'); // 'chat' | 'external-sync'
  const [inputPrompt, setInputPrompt] = useState('');
  const [scope, setScope] = useState('auto'); // 'auto' | 'page' | 'selected'
  const [isRevising, setIsRevising] = useState(false);

  // External Sync State
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [copiedRevision, setCopiedRevision] = useState(false);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [manualFeedback, setManualFeedback] = useState(null);

  const selectedNode = getSelectedNode();
  const activeAgent = getActiveAgent();
  const messages = chatMessages[activeProjectId] || [];
  const attachedRefs = references.filter((r) => r.attachedToTask);

  const outputPath = `c:\\programming\\layora\\.layora\\projects\\${activeProjectId}\\design_output.json`;
  const relativeOutputPath = `.layora/projects/${activeProjectId}/design_output.json`;

  const effectiveScope =
    scope === 'selected' && selectedNode
      ? 'selected'
      : scope === 'auto' && selectedNode
      ? 'selected'
      : 'page';

  const handleSendInstruction = async (customText = null) => {
    const instruction = (customText ?? inputPrompt).trim();
    if (!instruction || !activeDocument || isRevising) return;

    if (!customText) setInputPrompt('');

    appendChatMessage(activeProjectId, {
      role: 'user',
      content: instruction,
      scopeLabel:
        effectiveScope === 'selected' && selectedNode
          ? `Node: ${selectedNode.name}`
          : 'Whole Page',
    });

    setIsRevising(true);
    try {
      const result = await executeAgentRevision({
        agentConfig: activeAgent,
        schemaDoc: activeDocument,
        instruction,
        selectedNodeId: effectiveScope === 'selected' ? selectedNodeId : null,
        scope: effectiveScope,
      });

      appendChatMessage(activeProjectId, {
        role: 'assistant',
        content: result.summary,
        affectedNodes: result.affectedNodes,
      });

      stageRevisionForReview({
        instruction,
        summary: result.summary,
        affectedNodes: result.affectedNodes,
        updatedDocument: result.updatedDocument,
      });
    } catch (err) {
      appendChatMessage(activeProjectId, {
        role: 'system',
        content: `Revision failed: ${err.message}`,
      });
    } finally {
      setIsRevising(false);
    }
  };

  const handleCopyRevisionPrompt = async () => {
    const brief = revisionPrompt.trim() || 'Perbarui dan rapikan desain UI pada halaman ini.';
    const promptText = `Halo Antigravity! Tolong lakukan revisi pada desain Layora di file output ini:
${outputPath}

Permintaan revisi:
${brief}

Tolong perbarui file ${outputPath} dengan Layora Design Schema v1.0.0 yang telah disesuaikan.`;

    await navigator.clipboard.writeText(promptText);
    setCopiedRevision(true);
    setTimeout(() => setCopiedRevision(false), 2500);
  };

  const handleApplyPastedJson = async () => {
    setManualFeedback(null);
    const res = normalizeAndValidateSchema(pastedJson);
    if (!res.valid) {
      setManualFeedback({
        ok: false,
        message: `Gagal validasi JSON: ${res.diagnostics.errors.join('; ')}`,
      });
      return;
    }

    await saveVersionSnapshot({
      name: 'Pre-External Agent Handoff Backup',
      note: 'Automatic backup before applying External Agent JSON schema.',
      source: 'Auto-Snapshot',
    });

    await commitDocumentUpdate(res.document, true);
    setManualFeedback({
      ok: true,
      message: `Berhasil memvalidasi & menerapkan ${res.diagnostics.nodeCount} node ke Canvas!`,
    });
    setPastedJson('');
  };

  return (
    <div className="flex h-full flex-col justify-between text-xs">
      {/* Top Context & Mode Header */}
      <div className="border-b border-border p-3 space-y-2 bg-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="font-semibold text-text-primary">
              {isExternalAgent ? 'Antigravity File Sync' : 'AI Design Assistant'}
            </span>
          </div>

          <div className="inline-flex rounded border border-border bg-app p-0.5">
            {isExternalAgent ? (
              <span className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-meta font-medium text-white">
                <Terminal className="h-3 w-3" />
                <span>External Agent</span>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPanelMode('chat')}
                  className={`rounded px-2 py-0.5 text-meta font-medium ${
                    panelMode === 'chat' ? 'bg-accent text-white' : 'text-text-secondary'
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setPanelMode('external-sync')}
                  className={`rounded px-2 py-0.5 text-meta font-medium ${
                    panelMode === 'external-sync' ? 'bg-accent text-white' : 'text-text-secondary'
                  }`}
                >
                  Sync
                </button>
              </>
            )}
          </div>
        </div>

        {!isExternalAgent && panelMode === 'chat' && (
          <div className="flex items-center justify-between rounded border border-border bg-app px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {effectiveScope === 'selected' && selectedNode ? (
                <>
                  <Target className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-meta text-text-primary truncate">
                    Target: <strong>{selectedNode.name}</strong>
                  </span>
                </>
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                  <span className="text-meta text-text-secondary">
                    Scope: <strong>Whole Page</strong>
                  </span>
                </>
              )}
            </div>

            {selectedNode && (
              <button
                type="button"
                onClick={() => setScope(effectiveScope === 'selected' ? 'page' : 'selected')}
                className="text-meta text-accent hover:underline shrink-0 ml-2"
              >
                Ubah ke {effectiveScope === 'selected' ? 'Page' : 'Node'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pending Revision Review Banner */}
      {pendingRevision && (
        <div className="border-b border-accent bg-accent-subtle p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-accent text-xs">
              Review Perubahan Desain AI
            </span>
            <span className="rounded bg-accent px-1.5 py-0.5 text-meta text-white">
              {pendingRevision.affectedNodes?.length || 1} node
            </span>
          </div>

          <p className="text-meta text-text-primary leading-relaxed">
            {pendingRevision.summary}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={acceptPendingRevision}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-accent py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Terapkan (Apply)</span>
            </button>
            <button
              type="button"
              onClick={discardPendingRevision}
              className="inline-flex items-center justify-center gap-1 rounded border border-border bg-panel px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
              <span>Batal</span>
            </button>
          </div>
        </div>
      )}

      {isExternalAgent || panelMode === 'external-sync' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Live Sync Status Box */}
          <div className="rounded border border-border bg-app p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
                </span>
                <span className="font-semibold text-text-primary">Antigravity Live Sync</span>
              </div>
              <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                Auto-Watching
              </span>
            </div>

            <div className="text-meta text-text-secondary space-y-1">
              <div className="text-text-muted text-[11px]">Memantau File Output:</div>
              <div className="font-mono text-text-primary text-[11px] break-all">
                {relativeOutputPath}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {onManualRefreshExchange && (
                <button
                  type="button"
                  onClick={onManualRefreshExchange}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-border bg-panel py-1 text-meta text-text-secondary hover:text-text-primary transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh File Sekarang</span>
                </button>
              )}

              {onSwitchToAgentRoom && (
                <button
                  type="button"
                  onClick={onSwitchToAgentRoom}
                  className="inline-flex items-center justify-center gap-1 rounded border border-border bg-panel px-2.5 py-1 text-meta text-accent hover:bg-panel-muted transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Agent Room</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Revision Prompt Generator */}
          <div className="rounded border border-border bg-app p-3 space-y-2.5">
            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
              <Terminal className="h-3.5 w-3.5 text-accent" />
              <span>Kirim Revisi ke Real Antigravity</span>
            </div>

            <p className="text-meta text-text-secondary leading-relaxed">
              Ketik revisi yang diinginkan di bawah, lalu klik <strong>Salin Prompt Revisi</strong> untuk dikirim ke chat Antigravity di IDE:
            </p>

            <textarea
              rows={3}
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              placeholder="Contoh: Ubah warna aksen menjadi hijau emerald, tambahkan grafik garis sensor tren di bawah AQI card, dan buat layout lebih rapat..."
              className="w-full rounded border border-border bg-panel p-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
            />

            <button
              type="button"
              onClick={handleCopyRevisionPrompt}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded bg-accent py-2 text-xs font-semibold text-white hover:bg-accent-hover transition-colors shadow-sm"
            >
              {copiedRevision ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>
                {copiedRevision
                  ? 'Prompt Revisi Tersalin! Kirim di IDE'
                  : 'Salin Prompt Revisi untuk Antigravity'}
              </span>
            </button>

            <div className="rounded bg-panel-muted p-2 text-[11px] text-text-muted leading-relaxed">
              Setiap kali Antigravity menyimpan file output, Layora akan langsung merender perubahannya di kanvas secara real-time tanpa perlu copy-paste JSON manual!
            </div>
          </div>

          {/* Optional Manual Fallback Toggle */}
          <div className="border-t border-border pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setShowManualPaste(!showManualPaste)}
              className="inline-flex items-center gap-1 text-meta text-text-muted hover:text-text-secondary"
            >
              <span>{showManualPaste ? 'Sembunyikan Tempel Manual' : 'Opsi Cadangan: Tempel JSON Manual'}</span>
              {showManualPaste ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showManualPaste && (
              <div className="space-y-2 rounded border border-border bg-app p-2.5">
                <textarea
                  rows={4}
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  placeholder='Paste Layora Schema JSON di sini...'
                  className="w-full rounded border border-border bg-panel p-2 font-mono text-[11px] text-text-primary focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!pastedJson.trim()}
                  onClick={handleApplyPastedJson}
                  className="w-full rounded border border-accent bg-accent-subtle py-1 text-xs font-semibold text-accent hover:bg-accent hover:text-white disabled:opacity-50 transition-colors"
                >
                  Terapkan JSON Manual
                </button>
                {manualFeedback && (
                  <div
                    className={`rounded border p-2 text-meta ${
                      manualFeedback.ok
                        ? 'border-success/40 bg-success/10 text-success'
                        : 'border-danger/40 bg-danger/10 text-danger'
                    }`}
                  >
                    {manualFeedback.message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-3 py-1">
                <p className="text-secondary text-text-secondary leading-relaxed">
                  Ketik prompt di bawah atau klik salah satu aksi cepat untuk menghasilkan atau merevisi desain di Canvas:
                </p>
                <div className="space-y-1.5">
                  <span className="text-meta font-medium text-text-muted block">
                    Contoh Prompt Cepat:
                  </span>
                  {QUICK_REVISIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSendInstruction(suggestion)}
                      className="block w-full rounded border border-border bg-app px-2.5 py-1.5 text-left text-meta text-text-primary hover:border-accent transition-colors"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-control p-2.5 space-y-1 ${
                    msg.role === 'user'
                      ? 'bg-accent text-white ml-4'
                      : msg.role === 'system'
                      ? 'border border-border bg-panel-muted text-text-secondary text-meta'
                      : 'border border-border bg-app text-text-primary mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-meta opacity-80">
                    <span className="font-semibold uppercase">
                      {msg.role === 'user' ? 'Anda' : msg.role === 'system' ? 'System' : 'Layora AI'}
                    </span>
                    {msg.scopeLabel && <span>{msg.scopeLabel}</span>}
                  </div>
                  <p className="leading-relaxed">{msg.content}</p>
                </div>
              ))
            )}

            {isRevising && (
              <div className="flex items-center gap-2 rounded border border-border bg-app p-2.5 text-meta text-text-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                <span>Menyusun & memvalidasi Layora Design Schema...</span>
              </div>
            )}
          </div>

          {/* Bottom Prompt Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendInstruction();
            }}
            className="border-t border-border p-3 bg-panel space-y-2"
          >
            <textarea
              rows={2}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendInstruction();
                }
              }}
              placeholder={
                selectedNode
                  ? `Tulis instruksi untuk "${selectedNode.name}"...`
                  : 'Ketik prompt desain (misal: Buatkan dashboard deteksi kualitas udara)...'
              }
              className="w-full rounded-control border border-border bg-app p-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
            />

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-meta text-text-muted">
                <Paperclip className="h-3 w-3" />
                <span>{attachedRefs.length} ref aktif</span>
              </span>

              <button
                type="submit"
                disabled={!inputPrompt.trim() || isRevising}
                className="inline-flex items-center gap-1.5 rounded-control bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                <span>Kirim Prompt</span>
                <Send className="h-3 w-3" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
