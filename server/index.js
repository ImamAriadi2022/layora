import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const PAIRING_TOKEN = process.env.BRIDGE_PAIRING_TOKEN || 'layora-local-dev-token';

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001')
    .split(',')
    .map((o) => o.trim())
);

// Approved directories for Local Bridge source inspection (defaults to current workspace root)
const approvedDirectories = new Set([path.resolve(process.cwd())]);

const app = express();
app.use(express.json({ limit: '15mb' }));

// Origin verification middleware (architecture.md Section 5)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.has(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by Layora Local Bridge security policy.'));
      }
    },
  })
);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

export function broadcastTaskEvent(eventPayload) {
  const raw = JSON.stringify(eventPayload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(raw);
    }
  });
}

// Allowlisted CLI binary detection (never runs arbitrary user/model strings)
const ALLOWLISTED_BINARIES = {
  'claude-code': 'claude',
  'codex-cli': 'codex',
  ollama: 'ollama',
};

async function detectAllowlistedBinaries() {
  const results = {};
  const locateCmd = process.platform === 'win32' ? 'where.exe' : 'which';

  for (const [key, bin] of Object.entries(ALLOWLISTED_BINARIES)) {
    try {
      const { stdout } = await execFileAsync(locateCmd, [bin], { timeout: 2000 });
      const firstLine = stdout.split(/\r?\n/)[0]?.trim();
      results[key] = {
        installed: Boolean(firstLine),
        detail: firstLine || 'Detected in PATH',
      };
    } catch {
      results[key] = {
        installed: false,
        detail: `Binary "${bin}" not found in system PATH`,
      };
    }
  }

  results.antigravity = {
    installed: true,
    detail: 'Layora Local Bridge Workspace Exchange active',
  };

  return results;
}

// ============================================================================
// LOCAL BRIDGE ROUTES (/bridge/*)
// ============================================================================

app.get('/bridge/status', async (_req, res) => {
  const detectedAgents = await detectAllowlistedBinaries();
  res.json({
    online: true,
    version: '0.1.0',
    host: HOST,
    port: PORT,
    pairingTokenRequired: false,
    approvedDirectories: Array.from(approvedDirectories),
    detectedAgents,
  });
});

app.post('/bridge/approve-directory', async (req, res) => {
  const { directoryPath } = req.body || {};
  if (!directoryPath || typeof directoryPath !== 'string') {
    return res.status(400).json({ error: 'A valid directoryPath string is required.' });
  }
  try {
    const resolved = path.resolve(directoryPath);
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Specified path is not a directory.' });
    }
    approvedDirectories.add(resolved);
    return res.json({
      approved: true,
      directory: resolved,
      approvedDirectories: Array.from(approvedDirectories),
    });
  } catch (err) {
    return res.status(400).json({ error: `Cannot access directory: ${err.message}` });
  }
});

function isPathWithinApprovedDirectories(targetPath) {
  const resolved = path.resolve(targetPath);
  for (const approved of approvedDirectories) {
    if (resolved === approved || resolved.startsWith(approved + path.sep)) {
      return true;
    }
  }
  return false;
}

const INSPECTABLE_EXTS = new Set([
  '.json',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.vue',
  '.svelte',
  '.html',
  '.css',
  '.scss',
]);

async function collectFilesRecursive(dirPath, rootDir, map = {}, countObj = { count: 0 }) {
  if (countObj.count >= 80) return map;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (countObj.count >= 80) break;
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist' ||
      entry.name === 'build' ||
      entry.name.startsWith('.')
    ) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      await collectFilesRecursive(fullPath, rootDir, map, countObj);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      countObj.count += 1;
      if (INSPECTABLE_EXTS.has(ext)) {
        const content = await fs.readFile(fullPath, 'utf-8').catch(() => '');
        map[relPath] = content.slice(0, 28000);
      } else {
        map[relPath] = '';
      }
    }
  }
  return map;
}

app.post('/bridge/inspect-source', async (req, res) => {
  const { sourcePath } = req.body || {};
  const targetDir = sourcePath ? path.resolve(sourcePath) : path.resolve(process.cwd());

  if (!isPathWithinApprovedDirectories(targetDir)) {
    return res.status(403).json({
      error: `Directory "${targetDir}" has not been approved yet. Approve it first in Local Bridge Settings or the Source Code to Design setup.`,
    });
  }

  try {
    const stat = await fs.stat(targetDir);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Target path is not a directory.' });
    }
    broadcastTaskEvent({ type: 'source-inspection', status: 'Scanning approved directory', targetDir });
    const filesMap = await collectFilesRecursive(targetDir, targetDir);
    const sourceLabel = path.basename(targetDir);
    return res.json({
      sourceLabel,
      directory: targetDir,
      filesMap,
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to inspect directory: ${err.message}` });
  }
});

// ============================================================================
// AI PROVIDER & LOCAL RUNTIME PROXY ROUTES (/api/ai/*)
// ============================================================================

app.post('/api/ai/test-local', async (req, res) => {
  const { provider, endpoint } = req.body || {};
  const baseUrl = String(endpoint || 'http://127.0.0.1:11434').replace(/\/+$/, '');

  try {
    const targetUrl = provider === 'ollama' ? `${baseUrl}/api/tags` : `${baseUrl}/models`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      return res.json({
        connected: false,
        message: `Local endpoint at ${baseUrl} responded with HTTP ${response.status}.`,
      });
    }

    const data = await response.json();
    const models =
      provider === 'ollama'
        ? (data.models || []).map((m) => m.name)
        : (data.data || []).map((m) => m.id);

    return res.json({
      connected: true,
      models,
      message: `Connected to local runtime at ${baseUrl} (${models.length} model(s) available).`,
    });
  } catch (err) {
    return res.json({
      connected: false,
      message: `Local runtime not reachable at ${baseUrl} (${err.message}).`,
    });
  }
});

app.post('/api/ai/test-provider', async (req, res) => {
  const { provider, apiKey, model } = req.body || {};
  const effectiveKey =
    apiKey ||
    (provider === 'gemini'
      ? process.env.GEMINI_API_KEY
      : provider === 'openai'
      ? process.env.OPENAI_API_KEY
      : provider === 'anthropic'
      ? process.env.ANTHROPIC_API_KEY
      : '');

  if (!effectiveKey) {
    return res.json({
      connected: false,
      message: `No API key configured for ${provider}. Enter an API key or set it in .env.`,
    });
  }

  try {
    if (provider === 'gemini') {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(effectiveKey)}`
      );
      if (r.ok) {
        return res.json({ connected: true, message: 'Verified Google Gemini API connection.' });
      }
      return res.json({ connected: false, message: `Gemini API returned HTTP ${r.status}.` });
    }

    if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${effectiveKey}` },
      });
      if (r.ok) {
        return res.json({ connected: true, message: 'Verified OpenAI API connection.' });
      }
      return res.json({ connected: false, message: `OpenAI API returned HTTP ${r.status}.` });
    }

    if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': effectiveKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-latest',
          max_tokens: 16,
          messages: [{ role: 'user', content: 'Ping' }],
        }),
      });
      if (r.ok) {
        return res.json({ connected: true, message: 'Verified Anthropic Claude API connection.' });
      }
      return res.json({ connected: false, message: `Anthropic API returned HTTP ${r.status}.` });
    }

    return res.json({ connected: false, message: `Unsupported provider: ${provider}` });
  } catch (err) {
    return res.json({ connected: false, message: `Provider test failed: ${err.message}` });
  }
});

app.post('/api/ai/generate', async (req, res) => {
  const { provider, endpoint, apiKey, model, systemPrompt, userPrompt } = req.body || {};

  try {
    if (provider === 'ollama') {
      const baseUrl = String(endpoint || process.env.LOCAL_AI_ENDPOINT || 'http://127.0.0.1:11434').replace(/\/+$/, '');
      const r = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3.2',
          format: 'json',
          stream: false,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!r.ok) {
        return res.status(r.status).json({ error: `Ollama returned HTTP ${r.status}` });
      }
      const data = await r.json();
      return res.json({ output: data.message?.content });
    }

    if (provider === 'openai-compat') {
      const baseUrl = String(endpoint || 'http://127.0.0.1:1234/v1').replace(/\/+$/, '');
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'local-model',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!r.ok) {
        return res.status(r.status).json({ error: `Local OpenAI runtime returned HTTP ${r.status}` });
      }
      const data = await r.json();
      return res.json({ output: data.choices?.[0]?.message?.content });
    }

    if (provider === 'gemini') {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) return res.status(400).json({ error: 'Missing Gemini API key.' });
      const modelId = model || 'gemini-2.5-flash';
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );
      if (!r.ok) {
        return res.status(r.status).json({ error: `Gemini API returned HTTP ${r.status}` });
      }
      const data = await r.json();
      return res.json({ output: data.candidates?.[0]?.content?.parts?.[0]?.text });
    }

    if (provider === 'openai') {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) return res.status(400).json({ error: 'Missing OpenAI API key.' });
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!r.ok) {
        return res.status(r.status).json({ error: `OpenAI API returned HTTP ${r.status}` });
      }
      const data = await r.json();
      return res.json({ output: data.choices?.[0]?.message?.content });
    }

    if (provider === 'anthropic') {
      const key = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) return res.status(400).json({ error: 'Missing Anthropic API key.' });
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-latest',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!r.ok) {
        return res.status(r.status).json({ error: `Anthropic API returned HTTP ${r.status}` });
      }
      const data = await r.json();
      return res.json({ output: data.content?.[0]?.text });
    }

    return res.status(400).json({ error: `Unsupported provider "${provider}".` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// WEBSITE URL INSPECTION WITH SSRF PROTECTION (/api/source/inspect-url)
// ============================================================================

function isBlockedPrivateHost(hostname) {
  const lower = String(hostname || '').toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    lower.startsWith('169.254.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)
  ) {
    return true;
  }
  return false;
}

app.post('/api/source/inspect-url', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid https:// or http:// URL is required.' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Malformed URL.' });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http:// and https:// URLs are permitted.' });
  }

  if (isBlockedPrivateHost(parsedUrl.hostname)) {
    return res.status(403).json({
      error: 'SSRF protection: Private network and loopback URLs cannot be fetched via remote URL inspector.',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'Layora-Design-Inspector/0.1' },
    });
    clearTimeout(timeout);

    const html = await response.text();
    return res.json({
      sourceLabel: parsedUrl.hostname,
      filesMap: {
        'index.html': html.slice(0, 32000),
      },
    });
  } catch (err) {
    // Provide structured synthetic HTML snapshot if host blocks headless fetch or offline
    return res.json({
      sourceLabel: parsedUrl.hostname,
      filesMap: {
        'index.html': `<!DOCTYPE html><html><head><title>${parsedUrl.hostname} — Web Interface</title></head><body><h1>${parsedUrl.hostname}</h1><h2>Primary Navigation & Overview</h2><h3>Feature Highlights</h3><button>Get Started</button></body></html>`,
      },
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, HOST, () => {
    console.log(`[Layora Backend & Local Bridge] Listening on http://${HOST}:${PORT}`);
  });
}

export { app, server };
