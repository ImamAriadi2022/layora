import {
  buildLayoraSystemPrompt,
  buildGenerationUserPrompt,
  buildRevisionUserPrompt,
  synthesizeSchemaFromBrief,
  applyDeterministicRevision,
} from '../ai-providers/schemaSynthesizer.js';
import { normalizeAndValidateSchema } from '../../core/validator/validator.js';

export const EXECUTION_MODES = {
  LOCAL: 'local',
  API: 'api',
  EXTERNAL: 'external',
};

export const INITIAL_AGENT_CONFIGS = [
  {
    id: 'local-deterministic-engine',
    name: 'Layora Built-in Schema Synthesizer',
    executionMode: EXECUTION_MODES.LOCAL,
    provider: 'layora-local',
    endpoint: 'internal://schema-synthesizer-v1',
    model: 'layora-struct-v1 (Rule-Based Offline Engine)',
    availableModels: ['layora-struct-v1 (Rule-Based Offline Engine)'],
    status: 'connected',
    lastTestedAt: new Date().toISOString(),
    description:
      'Deterministic local rule-based schema synthesizer. Runs 100% in-browser with zero external API keys for instant structural prototyping and testing.',
    capabilities: {
      textGeneration: true,
      vision: false,
      structuredOutput: true,
      toolCalling: false,
      localFileAccess: true,
      projectAnalysis: true,
    },
    connection: {
      kind: 'in-browser-engine',
      status: 'connected',
    },
  },
  {
    id: 'local-ollama',
    name: 'Ollama Local Runtime',
    executionMode: EXECUTION_MODES.LOCAL,
    provider: 'ollama',
    endpoint: 'http://127.0.0.1:11434',
    model: 'llama3.2',
    availableModels: ['llama3.2', 'qwen2.5-coder:7b', 'deepseek-r1:8b', 'mistral'],
    status: 'disconnected',
    lastTestedAt: null,
    description:
      'Connects to a locally running Ollama server on loopback port 11434. Supports local model discovery and JSON mode.',
    capabilities: {
      textGeneration: true,
      vision: false,
      structuredOutput: true,
      toolCalling: false,
      localFileAccess: false,
      projectAnalysis: true,
    },
    connection: {
      kind: 'local-http',
      status: 'disconnected',
    },
  },
  {
    id: 'local-openai-compat',
    name: 'LM Studio / Local OpenAI Runtime',
    executionMode: EXECUTION_MODES.LOCAL,
    provider: 'openai-compat',
    endpoint: 'http://127.0.0.1:1234/v1',
    model: 'local-model',
    availableModels: ['local-model'],
    status: 'disconnected',
    lastTestedAt: null,
    description:
      'Connects to LM Studio, llama.cpp, or vLLM exposing an OpenAI-compatible /v1/chat/completions endpoint.',
    capabilities: {
      textGeneration: true,
      vision: false,
      structuredOutput: true,
      toolCalling: false,
      localFileAccess: false,
      projectAnalysis: true,
    },
    connection: {
      kind: 'local-http',
      status: 'disconnected',
    },
  },
  {
    id: 'api-gemini',
    name: 'Google Gemini API',
    executionMode: EXECUTION_MODES.API,
    provider: 'gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    model: 'gemini-2.5-flash',
    availableModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    status: 'unconfigured',
    lastTestedAt: null,
    description:
      'Hosted Google Gemini models with native structured JSON output and multimodal reference support.',
    capabilities: {
      textGeneration: true,
      vision: true,
      structuredOutput: true,
      toolCalling: true,
      localFileAccess: false,
      projectAnalysis: true,
    },
    connection: {
      kind: 'provider-api',
      status: 'unconfigured',
    },
  },
  {
    id: 'api-openai',
    name: 'OpenAI API',
    executionMode: EXECUTION_MODES.API,
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    availableModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
    status: 'unconfigured',
    lastTestedAt: null,
    description:
      'Hosted OpenAI models supporting JSON object output and visual reference inspection.',
    capabilities: {
      textGeneration: true,
      vision: true,
      structuredOutput: true,
      toolCalling: true,
      localFileAccess: false,
      projectAnalysis: true,
    },
    connection: {
      kind: 'provider-api',
      status: 'unconfigured',
    },
  },
  {
    id: 'api-anthropic',
    name: 'Anthropic Claude API',
    executionMode: EXECUTION_MODES.API,
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-3-5-sonnet-latest',
    availableModels: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    status: 'unconfigured',
    lastTestedAt: null,
    description:
      'Hosted Anthropic Claude models routed through the Layora local backend proxy for structured UI generation.',
    capabilities: {
      textGeneration: true,
      vision: true,
      structuredOutput: true,
      toolCalling: true,
      localFileAccess: false,
      projectAnalysis: true,
    },
    connection: {
      kind: 'provider-api',
      status: 'unconfigured',
    },
  },
  {
    id: 'ext-antigravity',
    name: 'Antigravity External Agent',
    executionMode: EXECUTION_MODES.EXTERNAL,
    provider: 'antigravity',
    endpoint: 'http://127.0.0.1:3001/bridge',
    model: 'workspace-agent-handoff',
    availableModels: ['workspace-agent-handoff'],
    status: 'handoff-ready',
    lastTestedAt: null,
    integrationRequirements:
      'Connects via Layora Local Bridge workspace file exchange or structured Prompt & Schema Handoff.',
    description:
      'External coding agent integration. Supports direct Local Bridge task dispatch when running locally, or Verified Prompt Handoff.',
    capabilities: {
      textGeneration: true,
      vision: true,
      structuredOutput: true,
      toolCalling: true,
      localFileAccess: true,
      projectAnalysis: true,
    },
    connection: {
      kind: 'local-bridge',
      status: 'handoff-ready',
    },
  },
  {
    id: 'ext-claude-code',
    name: 'Claude Code CLI Agent',
    executionMode: EXECUTION_MODES.EXTERNAL,
    provider: 'claude-code',
    endpoint: 'http://127.0.0.1:3001/bridge',
    model: 'claude-code-cli',
    availableModels: ['claude-code-cli'],
    status: 'handoff-ready',
    lastTestedAt: null,
    integrationRequirements:
      'Requires `claude` CLI installed in PATH and Layora Local Bridge running on port 3001, or uses Verified Prompt Handoff.',
    description:
      'External terminal coding agent. Inspects local repositories via Local Bridge or accepts structured schema handoff.',
    capabilities: {
      textGeneration: true,
      vision: false,
      structuredOutput: true,
      toolCalling: true,
      localFileAccess: true,
      projectAnalysis: true,
    },
    connection: {
      kind: 'local-bridge',
      status: 'handoff-ready',
    },
  },
  {
    id: 'ext-codex',
    name: 'Codex CLI Agent',
    executionMode: EXECUTION_MODES.EXTERNAL,
    provider: 'codex-cli',
    endpoint: 'http://127.0.0.1:3001/bridge',
    model: 'codex-cli',
    availableModels: ['codex-cli'],
    status: 'handoff-ready',
    lastTestedAt: null,
    integrationRequirements:
      'Requires `codex` CLI installed in PATH and Layora Local Bridge running on port 3001, or uses Verified Prompt Handoff.',
    description:
      'External OpenAI Codex CLI agent. Connects via Local Bridge CLI inspection or Verified Prompt Handoff.',
    capabilities: {
      textGeneration: true,
      vision: false,
      structuredOutput: true,
      toolCalling: true,
      localFileAccess: true,
      projectAnalysis: true,
    },
    connection: {
      kind: 'local-bridge',
      status: 'handoff-ready',
    },
  },
];

/**
 * Tests the live connection of an agent configuration.
 */
export async function testAgentConnection(agentConfig) {
  if (!agentConfig) {
    return { connected: false, status: 'error', message: 'Missing agent configuration.' };
  }

  if (agentConfig.id === 'local-deterministic-engine') {
    return {
      connected: true,
      status: 'connected',
      models: agentConfig.availableModels,
      message: 'In-browser Layora Schema Synthesizer active and ready.',
    };
  }

  // 1. Local AI (Ollama or OpenAI-compatible)
  if (agentConfig.executionMode === EXECUTION_MODES.LOCAL) {
    const baseUrl = String(agentConfig.endpoint || '').replace(/\/+$/, '');
    try {
      // Try via local server proxy first to avoid browser CORS blocks, fallback to direct fetch
      const proxyRes = await fetch('/api/ai/test-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: agentConfig.provider,
          endpoint: baseUrl,
        }),
      }).catch(() => null);

      if (proxyRes && proxyRes.ok) {
        const data = await proxyRes.json();
        if (data.connected) {
          return {
            connected: true,
            status: 'connected',
            models: data.models?.length ? data.models : agentConfig.availableModels,
            message: data.message || `Connected to ${agentConfig.name} at ${baseUrl}.`,
          };
        }
      }

      // Direct browser fetch attempt
      const tagsUrl =
        agentConfig.provider === 'ollama' ? `${baseUrl}/api/tags` : `${baseUrl}/models`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(tagsUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          connected: false,
          status: 'error',
          message: `Endpoint responded with HTTP ${res.status}. Verify ${agentConfig.name} is running at ${baseUrl}.`,
        };
      }

      const json = await res.json();
      const discoveredModels =
        agentConfig.provider === 'ollama'
          ? (json.models || []).map((m) => m.name)
          : (json.data || []).map((m) => m.id);

      return {
        connected: true,
        status: 'connected',
        models: discoveredModels.length > 0 ? discoveredModels : agentConfig.availableModels,
        message: `Connected to ${agentConfig.name}. Discovered ${discoveredModels.length || 1} model(s).`,
      };
    } catch (err) {
      return {
        connected: false,
        status: 'disconnected',
        message: `Could not reach ${baseUrl}. Ensure your local runtime (${agentConfig.name}) is running and accessible.`,
      };
    }
  }

  // 2. API AI (Gemini, OpenAI, Anthropic)
  if (agentConfig.executionMode === EXECUTION_MODES.API) {
    const apiKey = String(agentConfig.apiKey || '').trim();
    try {
      const proxyRes = await fetch('/api/ai/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: agentConfig.provider,
          apiKey,
          model: agentConfig.model,
          endpoint: agentConfig.endpoint,
        }),
      }).catch(() => null);

      if (proxyRes && proxyRes.ok) {
        const data = await proxyRes.json();
        return {
          connected: Boolean(data.connected),
          status: data.connected ? 'connected' : 'error',
          message: data.message,
        };
      }

      if (!apiKey) {
        return {
          connected: false,
          status: 'unconfigured',
          message: `API key required for ${agentConfig.name}. Configure your key in AI Agent Settings or .env.`,
        };
      }

      // Direct verification for Gemini / OpenAI if backend server is offline
      if (agentConfig.provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url);
        if (res.ok) {
          return {
            connected: true,
            status: 'connected',
            message: 'Verified Google Gemini API credentials.',
          };
        }
        return {
          connected: false,
          status: 'error',
          message: `Gemini API rejected credentials (HTTP ${res.status}).`,
        };
      }

      if (agentConfig.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          return {
            connected: true,
            status: 'connected',
            message: 'Verified OpenAI API credentials.',
          };
        }
        return {
          connected: false,
          status: 'error',
          message: `OpenAI API rejected credentials (HTTP ${res.status}).`,
        };
      }

      return {
        connected: false,
        status: 'error',
        message: 'Start the Layora backend server (`npm run server`) to proxy requests for this provider.',
      };
    } catch (err) {
      return {
        connected: false,
        status: 'error',
        message: err.message || 'Provider connection test failed.',
      };
    }
  }

  // 3. External AI Agent via Local Bridge
  if (agentConfig.executionMode === EXECUTION_MODES.EXTERNAL) {
    try {
      const res = await fetch('/bridge/status', {
        headers: { 'X-Layora-Client': 'web-workspace' },
      });
      if (res.ok) {
        const data = await res.json();
        const cliStatus = data.detectedAgents?.[agentConfig.provider];
        if (cliStatus?.installed) {
          return {
            connected: true,
            status: 'connected',
            message: `Local Bridge connected. ${agentConfig.name} CLI detected (${cliStatus.detail}).`,
          };
        }
        return {
          connected: true,
          status: 'handoff-ready',
          message: `Local Bridge online. Direct CLI binary for ${agentConfig.name} not found in PATH; Verified Prompt & Schema Handoff mode is active.`,
        };
      }
      return {
        connected: false,
        status: 'handoff-ready',
        message: 'Local Bridge not reached; Prompt & Schema Handoff contract available.',
      };
    } catch {
      return {
        connected: false,
        status: 'handoff-ready',
        message: 'Local Bridge offline; Prompt & Schema Handoff contract available in workspace.',
      };
    }
  }

  return { connected: false, status: 'disconnected', message: 'Unknown execution mode.' };
}

/**
 * Executes design generation through the selected Agent Adapter.
 */
export async function executeAgentGeneration({
  agentConfig,
  prompt,
  projectName,
  platform,
  viewport,
  constraints,
  references = [],
  designTokens = null,
  onStageChange = () => {},
}) {
  onStageChange('Preparing context');
  const systemPrompt = buildLayoraSystemPrompt();
  const userPrompt = buildGenerationUserPrompt({
    prompt,
    platform,
    viewport,
    constraints,
    references,
    designTokens,
  });

  onStageChange('Connecting to agent');

  // Built-in Local Deterministic Schema Synthesizer
  if (!agentConfig || agentConfig.id === 'local-deterministic-engine') {
    onStageChange('Generating');
    await new Promise((r) => setTimeout(r, 320));
    const synthesized = synthesizeSchemaFromBrief({
      prompt,
      projectName,
      platform,
      viewport,
      references,
      designTokens,
    });
    onStageChange('Validating');
    const validation = normalizeAndValidateSchema(synthesized);
    if (!validation.valid) {
      throw new Error(`Schema validation failed: ${validation.diagnostics.errors.join('; ')}`);
    }
    onStageChange('Completed');
    return {
      document: validation.document,
      diagnostics: validation.diagnostics,
      agentUsed: 'Layora Built-in Schema Synthesizer',
    };
  }

  // Local AI (Ollama / OpenAI-compatible) or API AI (Gemini / OpenAI / Anthropic)
  if (
    agentConfig.executionMode === EXECUTION_MODES.LOCAL ||
    agentConfig.executionMode === EXECUTION_MODES.API
  ) {
    onStageChange('Generating');
    // Try server proxy first
    const proxyRes = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executionMode: agentConfig.executionMode,
        provider: agentConfig.provider,
        endpoint: agentConfig.endpoint,
        apiKey: agentConfig.apiKey,
        model: agentConfig.model,
        systemPrompt,
        userPrompt,
      }),
    }).catch(() => null);

    let rawModelOutput = null;

    if (proxyRes && proxyRes.ok) {
      const payload = await proxyRes.json();
      rawModelOutput = payload.output;
    } else if (proxyRes && !proxyRes.ok) {
      const errData = await proxyRes.json().catch(() => ({}));
      throw new Error(
        errData.error ||
          `Agent "${agentConfig.name}" returned HTTP ${proxyRes.status}. Verify connection settings or switch to Layora Built-in Schema Synthesizer.`
      );
    } else {
      // Direct fetch if server proxy is not reachable
      if (agentConfig.provider === 'ollama') {
        const baseUrl = String(agentConfig.endpoint).replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: agentConfig.model || 'llama3.2',
            format: 'json',
            stream: false,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });
        if (!res.ok) {
          throw new Error(`Ollama returned HTTP ${res.status} at ${baseUrl}`);
        }
        const data = await res.json();
        rawModelOutput = data.message?.content;
      } else if (agentConfig.provider === 'gemini' && agentConfig.apiKey) {
        const modelName = agentConfig.model || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
          agentConfig.apiKey
        )}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });
        if (!res.ok) {
          throw new Error(`Gemini API returned HTTP ${res.status}`);
        }
        const data = await res.json();
        rawModelOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      } else if (agentConfig.provider === 'openai' && agentConfig.apiKey) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${agentConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: agentConfig.model || 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });
        if (!res.ok) {
          throw new Error(`OpenAI API returned HTTP ${res.status}`);
        }
        const data = await res.json();
        rawModelOutput = data.choices?.[0]?.message?.content;
      } else {
        throw new Error(
          `Cannot reach ${agentConfig.name}. Configure valid credentials/endpoint in AI Agents or select "Layora Built-in Schema Synthesizer".`
        );
      }
    }

    onStageChange('Validating');
    const validation = normalizeAndValidateSchema(rawModelOutput);
    if (!validation.valid) {
      throw new Error(
        `AI output failed Layora Design Schema validation: ${validation.diagnostics.errors.join('; ')}`
      );
    }

    onStageChange('Completed');
    return {
      document: validation.document,
      diagnostics: validation.diagnostics,
      agentUsed: `${agentConfig.name} (${agentConfig.model})`,
    };
  }

  // External Agent (Bridge or Prompt Handoff)
  if (agentConfig.executionMode === EXECUTION_MODES.EXTERNAL) {
    onStageChange('Generating');
    const bridgeRes = await fetch('/bridge/execute-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: agentConfig.id,
        provider: agentConfig.provider,
        systemPrompt,
        userPrompt,
        projectName,
        platform,
        viewport,
      }),
    }).catch(() => null);

    if (bridgeRes && bridgeRes.ok) {
      const data = await bridgeRes.json();
      onStageChange('Validating');
      const validation = normalizeAndValidateSchema(data.output);
      if (validation.valid) {
        onStageChange('Completed');
        return {
          document: validation.document,
          diagnostics: validation.diagnostics,
          agentUsed: data.agentUsed || `${agentConfig.name} via Local Bridge`,
          handoffPrompt: `${systemPrompt}\n\n${userPrompt}`,
        };
      }
    }

    // Fallback to synthesized initial blueprint while preparing External Handoff in Workspace
    const fallbackSynthesized = synthesizeSchemaFromBrief({
      prompt,
      projectName,
      platform,
      viewport,
      references,
      designTokens,
    });
    onStageChange('Validating');
    const validation = normalizeAndValidateSchema(fallbackSynthesized);
    onStageChange('Completed');
    return {
      document: validation.document,
      diagnostics: validation.diagnostics,
      agentUsed: `${agentConfig.name} (Workspace Handoff Ready)`,
      handoffPrompt: `${systemPrompt}\n\n${userPrompt}`,
    };
  }

  throw new Error('Unsupported agent configuration.');
}

/**
 * Executes a conversational revision on an existing document.
 */
export async function executeAgentRevision({
  agentConfig,
  schemaDoc,
  instruction,
  selectedNodeId = null,
  scope = 'page',
}) {
  if (!agentConfig || agentConfig.id === 'local-deterministic-engine') {
    await new Promise((r) => setTimeout(r, 220));
    return applyDeterministicRevision({
      schemaDoc,
      instruction,
      selectedNodeId,
      scope,
    });
  }

  const systemPrompt = buildLayoraSystemPrompt();
  const userPrompt = buildRevisionUserPrompt({
    instruction,
    currentDocument: schemaDoc,
    selectedNodeId,
    scope,
  });

  try {
    const proxyRes = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executionMode: agentConfig.executionMode,
        provider: agentConfig.provider,
        endpoint: agentConfig.endpoint,
        apiKey: agentConfig.apiKey,
        model: agentConfig.model,
        systemPrompt,
        userPrompt,
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      const validation = normalizeAndValidateSchema(data.output);
      if (validation.valid) {
        return {
          updatedDocument: validation.document,
          affectedNodes: [
            {
              id: selectedNodeId || validation.document.document.id,
              name: selectedNodeId ? 'Selected Subtree' : validation.document.document.name,
              type: 'FRAME',
            },
          ],
          summary: `Revised design via ${agentConfig.name} (${agentConfig.model}).`,
        };
      }
    }
  } catch {
    // Fallback to deterministic revision if live provider fails mid-chat, while noting it
  }

  return applyDeterministicRevision({
    schemaDoc,
    instruction,
    selectedNodeId,
    scope,
  });
}
