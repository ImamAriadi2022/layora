import React, { useState } from 'react';
import {
  Bot,
  Cpu,
  Cloud,
  Terminal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  FolderPlus,
} from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore.js';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { EXECUTION_MODES } from '../../services/agent-adapters/agentRegistry.js';
import {
  buildLayoraSystemPrompt,
  buildGenerationUserPrompt,
} from '../../services/ai-providers/schemaSynthesizer.js';
import { normalizeAndValidateSchema } from '../../core/validator/validator.js';

export default function AiAgentsPage() {
  const {
    agents,
    activeAgentId,
    setActiveAgent,
    updateAgentConfig,
    testConnection,
    testingAgentId,
    bridgeStatus,
    checkBridgeHealth,
    approveBridgeDirectory,
  } = useAgentStore();

  const { activeDocument, commitDocumentUpdate } = useProjectStore();

  const [modeFilter, setModeFilter] = useState('all');
  const [newDirInput, setNewDirInput] = useState('');
  const [handoffAgent, setHandoffAgent] = useState(null);
  const [handoffTaskBrief, setHandoffTaskBrief] = useState(
    'Design a modern SaaS Developer API Key & Webhook Management Dashboard (1440x1024).'
  );
  const [pastedAgentJson, setPastedAgentJson] = useState('');
  const [handoffStatus, setHandoffStatus] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const visibleAgents = agents.filter(
    (a) => modeFilter === 'all' || a.executionMode === modeFilter
  );

  const handleApproveDirectory = async (e) => {
    e.preventDefault();
    if (!newDirInput.trim()) return;
    await approveBridgeDirectory(newDirInput.trim());
    setNewDirInput('');
  };

  const fullHandoffPrompt = `${buildLayoraSystemPrompt()}\n\n${buildGenerationUserPrompt({
    prompt: handoffTaskBrief,
    platform: 'Web',
    viewport: activeDocument?.document?.viewport || { width: 1440, height: 1024 },
  })}`;

  const handleCopyHandoffPrompt = async () => {
    await navigator.clipboard.writeText(fullHandoffPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleValidateAndApplyHandoff = async () => {
    setHandoffStatus(null);
    const res = normalizeAndValidateSchema(pastedAgentJson);
    if (!res.valid) {
      setHandoffStatus({
        ok: false,
        message: `Schema Validation Failed: ${res.diagnostics.errors.join('; ')}`,
      });
      return;
    }
    await commitDocumentUpdate(res.document, true);
    setHandoffStatus({
      ok: true,
      message: `Validated ${res.diagnostics.nodeCount} nodes (${res.diagnostics.repairedCount} auto-normalized) and applied to active project canvas!`,
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-page-title text-text-primary">AI Agent Configuration</h1>
          <p className="mt-1 text-secondary text-text-secondary">
            Manage Local AI runtimes, Hosted Provider APIs, and External Coding Agents via the adapter architecture.
          </p>
        </div>

        {/* Mode Segmented Filter */}
        <div className="inline-flex rounded-control border border-border bg-panel p-1">
          {[
            { id: 'all', label: 'All Modes' },
            { id: EXECUTION_MODES.LOCAL, label: 'Local AI' },
            { id: EXECUTION_MODES.API, label: 'API AI' },
            { id: EXECUTION_MODES.EXTERNAL, label: 'External Agent' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setModeFilter(tab.id)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                modeFilter === tab.id
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Local Bridge Security & Runtime Bar */}
      <div className="rounded-panel border border-border bg-panel p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="text-panel-title text-text-primary">
              Layora Local Bridge Service
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-meta font-medium ${
                bridgeStatus.online
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/10 text-warning'
              }`}
            >
              {bridgeStatus.online ? 'Connected (127.0.0.1:3001)' : 'Standby / Offline'}
            </span>
          </div>
          <p className="text-secondary text-text-secondary">
            Bound to loopback (`127.0.0.1`) with Origin verification and explicit directory permissioning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleApproveDirectory} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newDirInput}
              onChange={(e) => setNewDirInput(e.target.value)}
              placeholder="Approve local directory path..."
              className="w-56 rounded-control border border-border bg-app px-2.5 py-1.5 text-xs font-mono text-text-primary focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-control border border-border bg-panel-muted px-2.5 py-1.5 text-xs font-medium text-text-primary hover:border-accent"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Approve</span>
            </button>
          </form>

          <button
            type="button"
            onClick={checkBridgeHealth}
            className="inline-flex items-center gap-1.5 rounded-control border border-border bg-panel px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-panel-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Bridge</span>
          </button>
        </div>
      </div>

      {/* Agent Adapters Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {visibleAgents.map((agent) => {
          const isActive = agent.id === activeAgentId;
          const isTesting = testingAgentId === agent.id;

          return (
            <div
              key={agent.id}
              className={`flex flex-col justify-between rounded-panel border bg-panel p-5 space-y-4 ${
                isActive ? 'border-accent' : 'border-border'
              }`}
            >
              <div className="space-y-3">
                {/* Top Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-control border border-border bg-panel-muted text-text-primary">
                      {agent.executionMode === EXECUTION_MODES.LOCAL ? (
                        <Cpu className="h-4 w-4 text-accent" />
                      ) : agent.executionMode === EXECUTION_MODES.API ? (
                        <Cloud className="h-4 w-4 text-accent" />
                      ) : (
                        <Terminal className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-body text-text-primary">{agent.name}</h3>
                        <span className="rounded border border-border bg-panel-muted px-1.5 py-0.5 text-meta uppercase text-text-secondary">
                          {agent.executionMode}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-meta">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            agent.status === 'connected'
                              ? 'bg-success'
                              : agent.status === 'handoff-ready'
                              ? 'bg-accent'
                              : agent.status === 'error'
                              ? 'bg-danger'
                              : 'bg-warning'
                          }`}
                        />
                        <span className="text-text-secondary font-medium">
                          Status: {agent.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveAgent(agent.id)}
                    className={`rounded-control px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-accent text-white'
                        : 'border border-border bg-panel-muted text-text-primary hover:border-accent'
                    }`}
                  >
                    {isActive ? 'Active Default' : 'Select Agent'}
                  </button>
                </div>

                <p className="text-secondary text-text-secondary">{agent.description}</p>

                {/* Capability Matrix Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(agent.capabilities || {}).map(([capKey, supported]) => (
                    <span
                      key={capKey}
                      className={`rounded border px-2 py-0.5 text-meta ${
                        supported
                          ? 'border-border bg-panel-muted text-text-primary'
                          : 'border-border/50 bg-transparent text-text-muted line-through'
                      }`}
                    >
                      {capKey}
                    </span>
                  ))}
                </div>

                {/* Configuration Controls */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-border">
                  <div>
                    <label className="block text-label text-text-secondary mb-1">
                      {agent.executionMode === EXECUTION_MODES.API ? 'Provider Endpoint' : 'Endpoint / Bridge URI'}
                    </label>
                    <input
                      type="text"
                      value={agent.endpoint || ''}
                      disabled={agent.id === 'local-deterministic-engine'}
                      onChange={(e) => updateAgentConfig(agent.id, { endpoint: e.target.value })}
                      className="w-full rounded-control border border-border bg-app px-2.5 py-1.5 text-xs font-mono text-text-primary disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-label text-text-secondary mb-1">Model Identifier</label>
                    <input
                      type="text"
                      value={agent.model || ''}
                      disabled={agent.id === 'local-deterministic-engine'}
                      onChange={(e) => updateAgentConfig(agent.id, { model: e.target.value })}
                      className="w-full rounded-control border border-border bg-app px-2.5 py-1.5 text-xs font-mono text-text-primary disabled:opacity-60"
                    />
                  </div>
                </div>

                {agent.executionMode === EXECUTION_MODES.API && (
                  <div>
                    <label className="block text-label text-text-secondary mb-1">
                      API Key (Stored in browser local store only)
                    </label>
                    <input
                      type="password"
                      value={agent.apiKey || ''}
                      onChange={(e) =>
                        updateAgentConfig(agent.id, {
                          apiKey: e.target.value,
                          status: e.target.value ? 'configured' : 'unconfigured',
                        })
                      }
                      placeholder={`Enter ${agent.name} API key...`}
                      className="w-full rounded-control border border-border bg-app px-2.5 py-1.5 text-xs font-mono text-text-primary"
                    />
                  </div>
                )}

                {agent.lastMessage && (
                  <div className="rounded border border-border bg-panel-muted px-3 py-2 text-meta text-text-secondary flex items-center gap-2">
                    {agent.status === 'connected' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                    )}
                    <span>{agent.lastMessage}</span>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="text-meta text-text-muted">
                  {agent.lastTestedAt
                    ? `Verified ${new Date(agent.lastTestedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'Not tested in this session'}
                </div>

                <div className="flex items-center gap-2">
                  {agent.executionMode === EXECUTION_MODES.EXTERNAL && (
                    <button
                      type="button"
                      onClick={() => setHandoffAgent(agent)}
                      className="rounded-control border border-border bg-panel-muted px-3 py-1.5 text-xs font-medium text-text-primary hover:border-accent"
                    >
                      Prompt Handoff
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => testConnection(agent.id)}
                    disabled={isTesting}
                    className="inline-flex items-center gap-1.5 rounded-control border border-border bg-panel px-3 py-1.5 text-xs font-medium text-text-primary hover:border-accent"
                  >
                    <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin text-accent' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* External Agent Prompt & Schema Handoff Drawer/Modal */}
      {handoffAgent && (
        <div className="rounded-panel border border-accent bg-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-panel-title text-text-primary">
                External Agent Prompt & Schema Handoff — {handoffAgent.name}
              </h2>
              <p className="text-meta text-text-secondary">
                Copy the structured Layora Design Schema v1.0.0 prompt into {handoffAgent.name}, then paste the returned JSON below to validate and render it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHandoffAgent(null)}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-label text-text-primary">
                  1. Task Brief & Canonical Schema Prompt
                </label>
                <button
                  type="button"
                  onClick={handleCopyHandoffPrompt}
                  className="inline-flex items-center gap-1 rounded bg-accent px-2.5 py-1 text-meta text-white"
                >
                  {copiedPrompt ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedPrompt ? 'Copied Prompt' : 'Copy Full Handoff Prompt'}</span>
                </button>
              </div>
              <input
                type="text"
                value={handoffTaskBrief}
                onChange={(e) => setHandoffTaskBrief(e.target.value)}
                className="w-full rounded-control border border-border bg-app px-2.5 py-1.5 text-xs text-text-primary"
              />
              <textarea
                readOnly
                rows={7}
                value={fullHandoffPrompt}
                className="w-full rounded-control border border-border bg-panel-muted p-2.5 text-meta font-mono text-text-secondary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-label text-text-primary">
                  2. Paste External Agent JSON Output
                </label>
                <button
                  type="button"
                  onClick={handleValidateAndApplyHandoff}
                  className="rounded bg-accent px-3 py-1 text-meta font-medium text-white hover:bg-accent-hover"
                >
                  Validate & Apply to Workspace
                </button>
              </div>
              <textarea
                rows={9}
                value={pastedAgentJson}
                onChange={(e) => setPastedAgentJson(e.target.value)}
                placeholder='Paste JSON output from Codex / Claude Code / Antigravity here ({"schemaVersion": "1.0.0", "document": { ... }})'
                className="w-full rounded-control border border-border bg-app p-2.5 text-xs font-mono text-text-primary focus:border-accent focus:outline-none"
              />
              {handoffStatus && (
                <div
                  className={`rounded border p-2 text-xs ${
                    handoffStatus.ok
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-danger/40 bg-danger/10 text-danger'
                  }`}
                >
                  {handoffStatus.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
