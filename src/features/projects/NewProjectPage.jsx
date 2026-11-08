import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Monitor,
  Smartphone,
  Tablet,
  Cpu,
  Cloud,
  Terminal,
  Sparkles,
  Code2,
  FolderOpen,
  FileArchive,
  Globe,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Paperclip,
} from 'lucide-react';
import { VIEWPORT_PRESETS } from '../../core/design-schema/schema.js';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { useAgentStore } from '../../stores/useAgentStore.js';
import { useReferenceStore } from '../../stores/useReferenceStore.js';
import { useDesignSystemStore } from '../../stores/useDesignSystemStore.js';
import {
  EXECUTION_MODES,
  executeAgentGeneration,
} from '../../services/agent-adapters/agentRegistry.js';
import {
  analyzeZipArchiveFile,
  analyzeSourceFilesMap,
  inspectSourceViaBridge,
} from '../../services/local-bridge/sourceCodeAnalyzer.js';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialGenMode = searchParams.get('mode') === 'source-code' ? 'source-code' : 'scratch';

  const { createProject } = useProjectStore();
  const {
    agents,
    activeAgentId,
    setActiveAgent,
    updateAgentConfig,
    testConnection,
    testingAgentId,
    bridgeStatus,
    approveBridgeDirectory,
  } = useAgentStore();
  const { references, toggleReferenceTaskAttachment } = useReferenceStore();
  const { designSystem: designTokens } = useDesignSystemStore();

  // Step 1: Project Details
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('Web');
  const [viewport, setViewport] = useState({ width: 1440, height: 1024 });

  // Step 2: AI Execution Mode
  const [executionMode, setExecutionMode] = useState(EXECUTION_MODES.LOCAL);
  const [selectedAgentId, setSelectedAgentId] = useState(activeAgentId || 'local-deterministic-engine');

  // Step 3: Generation Mode
  const [generationMode, setGenerationMode] = useState(initialGenMode);

  // Create from Scratch state
  const [prompt, setPrompt] = useState(
    'Design a SaaS Developer Analytics & API Gateway Console with a left navigation rail, 3 KPI metric cards, and a real-time request log table.'
  );
  const [constraints, setConstraints] = useState(
    'Neutral surfaces, 1px subtle borders, Inter typography, high contrast legibility.'
  );

  // Source Code to Design state
  const [sourceType, setSourceType] = useState('directory'); // 'directory' | 'zip' | 'url' | 'git'
  const [sourcePathOrUrl, setSourcePathOrUrl] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [sourcePreviewReport, setSourcePreviewReport] = useState(null);
  const [reconstructedDocPreview, setReconstructedDocPreview] = useState(null);

  // Task Lifecycle State
  const [isRunning, setIsRunning] = useState(false);
  const [lifecycleStage, setLifecycleStage] = useState('Idle');
  const [errorMsg, setErrorMsg] = useState(null);
  const [testFeedback, setTestFeedback] = useState(null);

  useEffect(() => {
    const matchingAgents = agents.filter((a) => a.executionMode === executionMode);
    if (matchingAgents.length > 0 && !matchingAgents.some((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(matchingAgents[0].id);
    }
  }, [executionMode, agents, selectedAgentId]);

  const currentAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const handlePlatformSelect = (plat) => {
    setPlatform(plat);
    if (plat === 'Mobile') setViewport({ width: 390, height: 844 });
    else if (plat === 'Tablet') setViewport({ width: 834, height: 1194 });
    else setViewport({ width: 1440, height: 1024 });
  };

  const handleTestSelectedAgent = async () => {
    if (!currentAgent) return;
    setTestFeedback(null);
    const res = await testConnection(currentAgent.id);
    if (res) {
      setTestFeedback(res);
    }
  };

  const handleInspectSourcePreview = async () => {
    setErrorMsg(null);
    setIsRunning(true);
    setLifecycleStage('Inspecting project structure & files');
    try {
      let analysisResult = null;
      if (sourceType === 'zip') {
        if (zipFile) {
          analysisResult = await analyzeZipArchiveFile(zipFile, viewport);
        } else {
          // Provide a realistic multi-file React + Tailwind codebase bundle if no ZIP uploaded yet
          const sampleFilesMap = {
            'package.json': JSON.stringify({
              name: 'acme-cloud-portal',
              dependencies: { react: '^18.3.1', tailwindcss: '^3.4.0', 'lucide-react': '^0.460.0' },
              devDependencies: { vite: '^6.0.0' },
            }),
            'src/pages/OverviewDashboard.jsx':
              'export default function OverviewDashboard() { return <main><h1>Cloud Operations Center</h1><h2>Active Services & Telemetry</h2><button>Deploy Service</button></main>; }',
            'src/pages/BillingSettings.jsx':
              'export default function BillingSettings() { return <main><h1>Usage & Invoice Ledger</h1><h2>Monthly Compute Breakdown</h2></main>; }',
            'src/components/MetricsHeader.jsx': 'export function MetricsHeader() {}',
            'src/components/ServiceHealthTable.jsx': 'export function ServiceHealthTable() {}',
            'src/components/BillingSummaryCard.jsx': 'export function BillingSummaryCard() {}',
            'src/styles/theme.css': ':root { --primary: #5B63D3; --surface: #0F172A; --bg: #F8FAFC; }',
          };
          analysisResult = analyzeSourceFilesMap(sampleFilesMap, 'acme-cloud-portal.zip', viewport);
        }
      } else if (sourceType === 'directory' || sourceType === 'git') {
        if (sourcePathOrUrl.trim()) {
          await approveBridgeDirectory(sourcePathOrUrl.trim());
        }
        analysisResult = await inspectSourceViaBridge({
          sourceType,
          sourceValue: sourcePathOrUrl.trim(),
          viewport,
        });
      } else if (sourceType === 'url') {
        const targetUrl = sourcePathOrUrl.trim() || 'https://example.com';
        analysisResult = await inspectSourceViaBridge({
          sourceType: 'url',
          sourceValue: targetUrl,
          viewport,
        });
      }

      if (analysisResult) {
        setSourcePreviewReport(analysisResult.report);
        setReconstructedDocPreview(analysisResult.document);
        if (!projectName.trim()) {
          setProjectName(`${analysisResult.report.sourceLabel} Design`);
        }
      }
      setLifecycleStage('Inspection Complete');
    } catch (err) {
      setErrorMsg(err.message);
      setLifecycleStage('Failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCreateAndGenerate = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    const finalName =
      projectName.trim() ||
      (generationMode === 'source-code' ? 'Reconstructed Source Project' : 'New UI Design Project');

    setIsRunning(true);
    setActiveAgent(selectedAgentId);

    try {
      // External Agent (Antigravity) Flow: Generate exchange folders & go straight to Agent Room
      if (executionMode === EXECUTION_MODES.EXTERNAL) {
        setLifecycleStage('Menyiapkan file exchange untuk Antigravity');
        const projId = `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const docId = `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

        let sourceAnalysisData = sourcePreviewReport;
        if (generationMode === 'source-code' && !sourceAnalysisData) {
          try {
            if (sourceType === 'zip' && zipFile) {
              const res = await analyzeZipArchiveFile(zipFile, viewport);
              sourceAnalysisData = res.report;
            } else if (sourcePathOrUrl.trim()) {
              await approveBridgeDirectory(sourcePathOrUrl.trim());
              const res = await inspectSourceViaBridge({
                sourceType,
                sourceValue: sourcePathOrUrl.trim(),
                viewport,
              });
              sourceAnalysisData = res?.report;
            }
          } catch (e) {
            console.warn('Could not auto-analyze source before exchange init:', e);
          }
        }

        let bridgeExchange = null;
        try {
          const initRes = await fetch('/bridge/init-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: projId,
              projectName: finalName,
              platform,
              viewport,
              generationMode,
              prompt: prompt || `Proyek ${finalName} (${generationMode})`,
              sourcePath: sourcePathOrUrl || '',
              sourceCodeAnalysis: sourceAnalysisData || null,
              designTokens: designTokens || null,
              references: references.filter((r) => r.attachedToTask),
            }),
          });
          if (initRes.ok) {
            bridgeExchange = await initRes.json();
          }
        } catch {
          // offline fallback
        }

        const emptyInitialDoc = {
          schemaVersion: '1.0.0',
          document: {
            id: docId,
            name: finalName,
            viewport,
            background: '#0F172A',
            children: [],
          },
          metadata: {
            createdAt: new Date().toISOString(),
            generatedBy: 'Antigravity External Agent (Pending First Prompt)',
            sourceMode: generationMode,
            awaitingExternalAgent: true,
          },
        };

        await createProject({
          id: projId,
          name: finalName,
          description: description || `Proyek terhubung ke Antigravity via file exchange.`,
          platform,
          viewport,
          executionMode,
          selectedAgentId,
          generationMode,
          initialDocument: emptyInitialDoc,
          bridgeExchange,
          sourceReport: sourceAnalysisData || null,
        });

        navigate('/workspace?view=agent-room');
        return;
      }

      if (generationMode === 'source-code') {
        setLifecycleStage('Preparing source code reconstruction');
        let docToUse = reconstructedDocPreview;
        let reportToUse = sourcePreviewReport;

        if (!docToUse) {
          if (sourceType === 'zip' && zipFile) {
            const res = await analyzeZipArchiveFile(zipFile, viewport);
            docToUse = res.document;
            reportToUse = res.report;
          } else if (sourceType === 'url') {
            const res = await inspectSourceViaBridge({
              sourceType: 'url',
              sourceValue: sourcePathOrUrl.trim() || 'https://example.com',
              viewport,
            });
            docToUse = res.document;
            reportToUse = res.report;
          } else {
            try {
              const res = await inspectSourceViaBridge({
                sourceType: 'directory',
                sourceValue: sourcePathOrUrl.trim(),
                viewport,
              });
              docToUse = res.document;
              reportToUse = res.report;
            } catch {
              // Fallback sample reconstruction if bridge is not reachable
              const fallbackRes = analyzeSourceFilesMap(
                {
                  'package.json': JSON.stringify({
                    name: finalName.toLowerCase().replace(/\s+/g, '-'),
                    dependencies: { react: '^18.3.1', tailwindcss: '^3.4.0' },
                  }),
                  'src/pages/MainDashboard.jsx': `<h1>${finalName}</h1><h2>Overview & Controls</h2>`,
                  'src/components/NavigationBar.jsx': '',
                  'src/components/DataGridPanel.jsx': '',
                  'src/components/StatusWidget.jsx': '',
                },
                finalName,
                viewport
              );
              docToUse = fallbackRes.document;
              reportToUse = fallbackRes.report;
            }
          }
        }

        setLifecycleStage('Rendering reconstructed design');
        await createProject({
          name: finalName,
          description: description || `Reconstructed from ${reportToUse?.framework || 'source'} project.`,
          platform,
          viewport,
          executionMode,
          selectedAgentId,
          generationMode: 'source-code',
          initialDocument: docToUse,
          sourceReport: reportToUse,
        });

        navigate('/workspace');
        return;
      }

      // Create from Scratch Flow
      const attachedRefs = references.filter((r) => r.attachedToTask);
      const genResult = await executeAgentGeneration({
        agentConfig: currentAgent,
        prompt,
        projectName: finalName,
        platform,
        viewport,
        constraints,
        references: attachedRefs,
        designTokens,
        onStageChange: (stage) => setLifecycleStage(stage),
      });

      setLifecycleStage('Rendering');
      await createProject({
        name: finalName,
        description: description || prompt.slice(0, 140),
        platform,
        viewport,
        executionMode,
        selectedAgentId,
        generationMode: 'scratch',
        initialDocument: genResult.document,
      });

      navigate('/workspace');
    } catch (err) {
      setErrorMsg(err.message);
      setLifecycleStage('Failed');
    } finally {
      setIsRunning(false);
    }
  };

  const filteredAgents = agents.filter((a) => a.executionMode === executionMode);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-page-title text-text-primary">Create New Project</h1>
        <p className="mt-1 text-secondary text-text-secondary">
          Configure target viewport, AI execution environment, and generation workflow.
        </p>
      </div>

      <form onSubmit={handleCreateAndGenerate} className="space-y-6">
        {/* STEP 1: PROJECT DETAILS & VIEWPORT */}
        <section className="rounded-panel border border-border bg-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-panel-title text-text-primary">1. Project Details & Viewport</h2>
            <span className="text-meta text-text-muted">Step 1 of 3</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-label text-text-primary mb-1.5">Project Name</label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Sentinel Cloud Console"
                className="w-full rounded-control border border-border bg-app px-3 py-2 text-body text-text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-label text-text-primary mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Concise summary of the product or screen goal"
                className="w-full rounded-control border border-border bg-app px-3 py-2 text-body text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
            <div>
              <label className="block text-label text-text-primary mb-1.5">Target Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Web', icon: Monitor, label: 'Web' },
                  { id: 'Tablet', icon: Tablet, label: 'Tablet' },
                  { id: 'Mobile', icon: Smartphone, label: 'Mobile' },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = platform === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePlatformSelect(item.id)}
                      className={`flex items-center justify-center gap-2 rounded-control border px-3 py-2 text-xs font-medium transition-colors ${
                        active
                          ? 'border-accent bg-accent-subtle text-accent'
                          : 'border-border bg-app text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-label text-text-primary mb-1.5">
                Viewport Dimensions (px)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={`${viewport.width}x${viewport.height}`}
                  onChange={(e) => {
                    const [w, h] = e.target.value.split('x').map(Number);
                    if (w && h) setViewport({ width: w, height: h });
                  }}
                  className="flex-1 rounded-control border border-border bg-app px-2.5 py-2 text-xs text-text-primary focus:border-accent focus:outline-none"
                >
                  {VIEWPORT_PRESETS.map((preset) => (
                    <option key={preset.id} value={`${preset.width}x${preset.height}`}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={viewport.width}
                  onChange={(e) => setViewport({ ...viewport, width: Number(e.target.value) })}
                  className="w-20 rounded-control border border-border bg-app px-2 py-2 text-xs text-text-primary"
                  aria-label="Viewport Width"
                />
                <span className="text-text-muted text-xs">×</span>
                <input
                  type="number"
                  value={viewport.height}
                  onChange={(e) => setViewport({ ...viewport, height: Number(e.target.value) })}
                  className="w-20 rounded-control border border-border bg-app px-2 py-2 text-xs text-text-primary"
                  aria-label="Viewport Height"
                />
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2: AI EXECUTION MODE */}
        <section className="rounded-panel border border-border bg-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-panel-title text-text-primary">2. AI Execution Mode</h2>
            <span className="text-meta text-text-muted">Step 2 of 3</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                mode: EXECUTION_MODES.LOCAL,
                title: 'Local AI',
                icon: Cpu,
                desc: 'Runs through a local model runtime (Ollama / LM Studio) or the built-in Layora Schema Synthesizer.',
              },
              {
                mode: EXECUTION_MODES.API,
                title: 'API AI',
                icon: Cloud,
                desc: 'Connects to hosted model providers (Google Gemini, OpenAI, Anthropic Claude) with structured JSON output.',
              },
              {
                mode: EXECUTION_MODES.EXTERNAL,
                title: 'External AI Agent',
                icon: Terminal,
                desc: 'Integrates with Antigravity, Claude Code, or Codex CLI via Local Bridge or Prompt Handoff.',
              },
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = executionMode === option.mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setExecutionMode(option.mode)}
                  className={`flex flex-col items-start text-left rounded-control border p-3.5 transition-colors ${
                    isSelected
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border bg-app hover:border-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs text-text-primary">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                    <span>{option.title}</span>
                  </div>
                  <p className="mt-1.5 text-meta text-text-secondary leading-relaxed">
                    {option.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Relevant Agent Configuration Based on Execution Mode */}
          {currentAgent && (
            <div className="rounded-control border border-border bg-panel-muted p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-label text-text-primary mb-1">
                    Select Adapter ({executionMode.toUpperCase()})
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full rounded-control border border-border bg-panel px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
                  >
                    {filteredAgents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-label text-text-primary mb-1">Model</label>
                  <input
                    type="text"
                    value={currentAgent.model || ''}
                    onChange={(e) => updateAgentConfig(currentAgent.id, { model: e.target.value })}
                    className="w-full rounded-control border border-border bg-panel px-2.5 py-1.5 text-xs font-mono text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {executionMode === EXECUTION_MODES.LOCAL && currentAgent.id !== 'local-deterministic-engine' && (
                <div>
                  <label className="block text-label text-text-primary mb-1">
                    Local Runtime Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={currentAgent.endpoint || ''}
                    onChange={(e) => updateAgentConfig(currentAgent.id, { endpoint: e.target.value })}
                    placeholder="http://127.0.0.1:11434"
                    className="w-full rounded-control border border-border bg-panel px-2.5 py-1.5 text-xs font-mono text-text-primary"
                  />
                </div>
              )}

              {executionMode === EXECUTION_MODES.API && (
                <div>
                  <label className="block text-label text-text-primary mb-1">
                    Provider API Key ({currentAgent.name})
                  </label>
                  <input
                    type="password"
                    value={currentAgent.apiKey || ''}
                    onChange={(e) => updateAgentConfig(currentAgent.id, { apiKey: e.target.value })}
                    placeholder="Enter API Key (stored locally, never embedded in project exports)"
                    className="w-full rounded-control border border-border bg-panel px-2.5 py-1.5 text-xs font-mono text-text-primary"
                  />
                </div>
              )}

              {executionMode === EXECUTION_MODES.EXTERNAL && (
                <div className="text-meta text-text-secondary">
                  <strong>Integration Contract:</strong> {currentAgent.integrationRequirements}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-meta text-text-secondary">{currentAgent.description}</span>
                <button
                  type="button"
                  onClick={handleTestSelectedAgent}
                  disabled={testingAgentId === currentAgent.id}
                  className="shrink-0 rounded-control border border-border bg-panel px-3 py-1 text-xs font-medium text-text-primary hover:border-accent"
                >
                  {testingAgentId === currentAgent.id ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {testFeedback && (
                <div
                  className={`rounded border p-2 text-xs ${
                    testFeedback.connected
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-warning/40 bg-warning/10 text-warning'
                  }`}
                >
                  {testFeedback.message}
                </div>
              )}
            </div>
          )}
        </section>

        {/* STEP 3: GENERATION MODE */}
        <section className="rounded-panel border border-border bg-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-panel-title text-text-primary">3. Generation Workflow</h2>
            <span className="text-meta text-text-muted">Step 3 of 3</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setGenerationMode('scratch')}
              className={`flex items-start gap-3 rounded-control border p-3.5 text-left transition-colors ${
                generationMode === 'scratch'
                  ? 'border-accent bg-accent-subtle'
                  : 'border-border bg-app hover:border-text-muted'
              }`}
            >
              <Sparkles
                className={`h-4 w-4 mt-0.5 shrink-0 ${
                  generationMode === 'scratch' ? 'text-accent' : 'text-text-secondary'
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-text-primary">Create from Scratch</div>
                <p className="mt-1 text-meta text-text-secondary">
                  Generate a structured UI design from a product description, layout constraints, and visual references.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setGenerationMode('source-code')}
              className={`flex items-start gap-3 rounded-control border p-3.5 text-left transition-colors ${
                generationMode === 'source-code'
                  ? 'border-accent bg-accent-subtle'
                  : 'border-border bg-app hover:border-text-muted'
              }`}
            >
              <Code2
                className={`h-4 w-4 mt-0.5 shrink-0 ${
                  generationMode === 'source-code' ? 'text-accent' : 'text-text-secondary'
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-text-primary">Source Code to Design</div>
                <p className="mt-1 text-meta text-text-secondary">
                  Inspect a local directory, ZIP archive, repository, or website URL and reconstruct its UI into Layora nodes.
                </p>
              </div>
            </button>
          </div>

          {generationMode === 'scratch' ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-label text-text-primary mb-1.5">
                  Design Prompt & Screen Requirements
                </label>
                <textarea
                  rows={3}
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the application purpose, required sections, navigation structure, and key components..."
                  className="w-full rounded-control border border-border bg-app p-3 text-body text-text-primary focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-label text-text-primary mb-1.5">
                  Layout & Visual Constraints (Optional)
                </label>
                <input
                  type="text"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  className="w-full rounded-control border border-border bg-app px-3 py-2 text-xs text-text-primary focus:border-accent focus:outline-none"
                />
              </div>

              {/* Attach Project References */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-label text-text-primary flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-text-secondary" />
                    <span>Attach References ({references.filter((r) => r.attachedToTask).length} selected)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/references')}
                    className="text-meta text-accent hover:underline"
                  >
                    Manage References
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {references.slice(0, 6).map((ref) => (
                    <label
                      key={ref.id}
                      className={`flex items-center gap-2 rounded-control border p-2 cursor-pointer text-xs ${
                        ref.attachedToTask
                          ? 'border-accent bg-accent-subtle'
                          : 'border-border bg-app'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(ref.attachedToTask)}
                        onChange={() => toggleReferenceTaskAttachment(ref.id)}
                        className="rounded border-border text-accent"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-text-primary truncate">{ref.name}</div>
                        <div className="text-meta text-text-muted uppercase">{ref.type}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Engine Selection for Source Code */}
              <div className="rounded-control border border-border bg-panel-muted p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">
                    Pilih Engine Pemrosesan Source Code:
                  </span>
                  <span className="text-meta font-medium text-accent">
                    {executionMode === EXECUTION_MODES.EXTERNAL
                      ? 'Antigravity File Sync'
                      : 'Local Built-in Synthesizer'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setExecutionMode(EXECUTION_MODES.EXTERNAL);
                      const extAgent = agents.find((a) => a.executionMode === EXECUTION_MODES.EXTERNAL);
                      if (extAgent) setSelectedAgentId(extAgent.id);
                    }}
                    className={`p-3 rounded-control border text-left transition-all ${
                      executionMode === EXECUTION_MODES.EXTERNAL
                        ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent'
                        : 'border-border bg-panel text-text-secondary hover:border-text-muted hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-accent">
                      <Terminal className="h-4 w-4" />
                      <span>Antigravity AI Agent (Direkomendasikan)</span>
                    </div>
                    <p className="mt-1.5 text-meta text-text-secondary leading-relaxed">
                      Membuat folder exchange <code>.layora/</code> langsung di dalam folder kode sumber referensi Anda. Antigravity di VS Code/IDE akan membaca dan merender 1 master canvas yang ramah Figma.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExecutionMode(EXECUTION_MODES.LOCAL);
                      const locAgent = agents.find((a) => a.executionMode === EXECUTION_MODES.LOCAL);
                      if (locAgent) setSelectedAgentId(locAgent.id);
                    }}
                    className={`p-3 rounded-control border text-left transition-all ${
                      executionMode === EXECUTION_MODES.LOCAL
                        ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent'
                        : 'border-border bg-panel text-text-secondary hover:border-text-muted hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-text-primary">
                      <Cpu className="h-4 w-4" />
                      <span>Local Rule-Based Synthesizer</span>
                    </div>
                    <p className="mt-1.5 text-meta text-text-secondary leading-relaxed">
                      Ekstraksi instan berbasis parser lokal di browser tanpa AI agent eksternal. Cepat untuk inspeksi struktur awal.
                    </p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { id: 'directory', label: 'Local Directory', icon: FolderOpen },
                  { id: 'zip', label: 'ZIP Archive', icon: FileArchive },
                  { id: 'url', label: 'Website URL', icon: Globe },
                  { id: 'git', label: 'Git Repository', icon: GitBranch },
                ].map((src) => {
                  const Icon = src.icon;
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => {
                        setSourceType(src.id);
                        setSourcePreviewReport(null);
                      }}
                      className={`flex items-center justify-center gap-2 rounded-control border px-3 py-2 text-xs font-medium ${
                        sourceType === src.id
                          ? 'border-accent bg-accent-subtle text-accent'
                          : 'border-border bg-app text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{src.label}</span>
                    </button>
                  );
                })}
              </div>

              {sourceType === 'zip' ? (
                <div className="rounded-control border border-dashed border-border bg-app p-4 space-y-2">
                  <label className="block text-label text-text-primary">
                    Select Project `.zip` Archive (Max 25 MB, inspected without code execution)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                      className="text-xs text-text-secondary"
                    />
                    <button
                      type="button"
                      onClick={handleInspectSourcePreview}
                      className="rounded-control border border-border bg-panel px-3 py-1.5 text-xs font-medium text-text-primary hover:border-accent"
                    >
                      {zipFile ? 'Inspect Uploaded ZIP' : 'Inspect Sample React Codebase ZIP'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-label text-text-primary">
                    {sourceType === 'directory'
                      ? 'Approved Local Project Directory Path (Leave blank to inspect current workspace)'
                      : sourceType === 'url'
                      ? 'Accessible Public Website URL (SSRF-Protected)'
                      : 'Local or Cloned Git Repository Path'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sourcePathOrUrl}
                      onChange={(e) => setSourcePathOrUrl(e.target.value)}
                      placeholder={
                        sourceType === 'url'
                          ? 'https://example.com'
                          : bridgeStatus.approvedDirectories?.[0] || 'c:\\programming\\layora'
                      }
                      className="flex-1 rounded-control border border-border bg-app px-3 py-2 text-xs font-mono text-text-primary focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleInspectSourcePreview}
                      disabled={isRunning}
                      className="rounded-control border border-border bg-panel px-3.5 py-2 text-xs font-medium text-text-primary hover:border-accent"
                    >
                      Inspect Source
                    </button>
                  </div>
                </div>
              )}

              {/* Source Inspection Report Preview */}
              {sourcePreviewReport && (
                <div className="rounded-control border border-border bg-panel-muted p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">
                      Source Inspection Summary: {sourcePreviewReport.sourceLabel}
                    </span>
                    <span className="text-success font-medium">
                      {sourcePreviewReport.totalFiles} files inspected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded border border-border bg-panel p-2">
                      <span className="text-meta text-text-muted block">Detected Framework</span>
                      <span className="font-medium text-text-primary">{sourcePreviewReport.framework}</span>
                    </div>
                    <div className="rounded border border-border bg-panel p-2">
                      <span className="text-meta text-text-muted block">Styling System</span>
                      <span className="font-medium text-text-primary">{sourcePreviewReport.stylingSystem}</span>
                    </div>
                    <div className="rounded border border-border bg-panel p-2">
                      <span className="text-meta text-text-muted block">Routes & Components</span>
                      <span className="font-medium text-text-primary">
                        {sourcePreviewReport.discoveredRoutes.length} routes,{' '}
                        {sourcePreviewReport.discoveredComponents.length} components
                      </span>
                    </div>
                  </div>
                  {sourcePreviewReport.unreconstructedNotes?.length > 0 && (
                    <div className="text-meta text-text-secondary">
                      <strong>Reconstruction Note:</strong> {sourcePreviewReport.unreconstructedNotes[0]}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Task Status & Submit Bar */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-control border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between rounded-panel border border-border bg-panel px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span>
                  Stage: <strong className="text-text-primary">{lifecycleStage}</strong>
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>
                  Output will be validated against <strong>Layora Design Schema v1.0.0</strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-control border border-border bg-panel px-4 py-2 text-btn text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-control bg-accent px-5 py-2 text-btn text-white hover:bg-accent-hover disabled:opacity-60"
            >
              <span>
                {executionMode === EXECUTION_MODES.EXTERNAL
                  ? 'Inisialisasi File Exchange & Buka Antigravity Room'
                  : generationMode === 'source-code'
                  ? 'Reconstruct & Open Workspace'
                  : 'Generate Design & Open Workspace'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
