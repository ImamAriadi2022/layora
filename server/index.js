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
// FILE-BASED AGENT EXCHANGE BRIDGE (.layora/projects/<projectId>/... or <sourcePath>/.layora/...)
// ============================================================================

const EXCHANGE_BASE_DIR = path.resolve(process.cwd(), '.layora', 'projects');
const PROJECTS_MAP_FILE = path.join(process.cwd(), '.layora', 'projects_map.json');

async function loadProjectDirectoryMap() {
  try {
    const raw = await fs.readFile(PROJECTS_MAP_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveProjectDirectoryMap(map) {
  try {
    await fs.mkdir(path.dirname(PROJECTS_MAP_FILE), { recursive: true });
    await fs.writeFile(PROJECTS_MAP_FILE, JSON.stringify(map, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save project directory map:', e.message);
  }
}

async function resolveProjectPaths(projectId, candidateSourcePath = null) {
  const map = await loadProjectDirectoryMap();
  let projectDir = null;
  let sourceRoot = null;

  // 1. If explicit candidateSourcePath provided and is a valid directory
  if (candidateSourcePath && typeof candidateSourcePath === 'string' && candidateSourcePath.trim()) {
    const clean = path.resolve(candidateSourcePath.trim());
    try {
      const st = await fs.stat(clean);
      if (st.isDirectory()) {
        sourceRoot = clean;
        projectDir = path.join(clean, '.layora');
      }
    } catch {
      // not accessible dir
    }
  }

  // 2. Otherwise check stored mapping
  if (!projectDir && map[projectId]) {
    const stored = map[projectId];
    const candidateDir = typeof stored === 'string' ? stored : stored.projectDir;
    try {
      const st = await fs.stat(candidateDir);
      if (st.isDirectory()) {
        projectDir = candidateDir;
        sourceRoot = typeof stored === 'object' && stored.sourceRoot ? stored.sourceRoot : path.dirname(candidateDir);
      }
    } catch {
      // dir might have been removed
    }
  }

  // 3. Fallback to process.cwd()/.layora/projects/<projectId>
  if (!projectDir) {
    projectDir = path.join(EXCHANGE_BASE_DIR, projectId);
    sourceRoot = process.cwd();
  }

  const inputPath = path.join(projectDir, 'input_context.json');
  const outputPath = path.join(projectDir, 'design_output.json');

  let relativeInputPath;
  let relativeOutputPath;
  const normSource = sourceRoot ? path.resolve(sourceRoot).toLowerCase() : null;
  const normInput = path.resolve(inputPath).toLowerCase();
  const normOutput = path.resolve(outputPath).toLowerCase();

  if (normSource && normInput.startsWith(normSource)) {
    relativeInputPath = path.relative(sourceRoot, inputPath).replace(/\\/g, '/');
    relativeOutputPath = path.relative(sourceRoot, outputPath).replace(/\\/g, '/');
  } else {
    relativeInputPath = path.relative(process.cwd(), inputPath).replace(/\\/g, '/');
    relativeOutputPath = path.relative(process.cwd(), outputPath).replace(/\\/g, '/');
  }

  return {
    projectDir,
    sourceRoot,
    inputPath,
    outputPath,
    relativeInputPath,
    relativeOutputPath,
    isExternalDir: sourceRoot !== process.cwd(),
  };
}

app.post('/bridge/init-exchange', async (req, res) => {
  const {
    projectId,
    projectName,
    platform,
    viewport,
    generationMode,
    prompt,
    sourcePath,
    sourceCodeAnalysis,
    designTokens,
    references,
  } = req.body || {};

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  try {
    const {
      projectDir,
      sourceRoot,
      inputPath,
      outputPath,
      relativeInputPath,
      relativeOutputPath,
      isExternalDir,
    } = await resolveProjectPaths(projectId, sourcePath);

    await fs.mkdir(projectDir, { recursive: true });

    // Store in mapping so subsequent requests know where to find files
    const map = await loadProjectDirectoryMap();
    map[projectId] = { projectDir, sourceRoot, sourcePath: sourcePath || sourceRoot };
    await saveProjectDirectoryMap(map);

    // Also mirror to EXCHANGE_BASE_DIR/projectId as fallback backup
    const backupDir = path.join(EXCHANGE_BASE_DIR, projectId);
    await fs.mkdir(backupDir, { recursive: true });

    const inputContext = {
      projectId,
      projectName: projectName || 'Untitled Project',
      platform: platform || 'Web',
      viewport: viewport || { width: 1440, height: 1024 },
      generationMode: generationMode || 'scratch',
      userPrompt: prompt || '',
      sourcePath: sourcePath || sourceRoot || '',
      sourceCodeAnalysis: sourceCodeAnalysis || null,
      designTokens: designTokens || null,
      references: references || [],
      updatedAt: new Date().toISOString(),
      schemaSpecification: {
        schemaVersion: '1.0.0',
        rootFormat: {
          schemaVersion: '1.0.0',
          document: {
            id: 'string (e.g. doc_root)',
            name: projectName || 'Untitled Project',
            viewport: viewport || { width: 1440, height: 1024 },
            background: '#F8FAFC',
            children: ['Array of top-level FRAME nodes'],
          },
        },
        supportedNodeTypes: [
          'FRAME (containers, cards, bars, flex columns/rows)',
          'TEXT (typography, headings, labels, metrics, badges)',
          'RECTANGLE (shapes, dividers, visual accents)',
          'ELLIPSE (avatars, status dots, icon containers)',
          'IMAGE (photos, screenshots, external image URLs)',
          'VECTOR (icons, simple geometric SVG paths)',
          'GROUP (logical groupings)',
          'COMPONENT_INSTANCE (reusable UI elements)',
        ],
        layoutFlexboxRules: {
          mode: 'VERTICAL | HORIZONTAL | NONE',
          gap: 'number (e.g. 12, 16, 24)',
          padding: 'number or { top, right, bottom, left }',
          alignment: 'START | CENTER | END | SPACE_BETWEEN',
          crossAlignment: 'START | CENTER | END | STRETCH',
        },
      },
      instructionsForAntigravity: [
        `1. Baca seluruh konteks di file ini: ${inputPath}`,
        sourceRoot ? `2. Kode sumber referensi proyek berada di direktori: ${sourceRoot}` : '2. Gunakan konteks UI di atas',
        '3. Buatkan 1 single master canvas dalam Layora Design Schema v1.0.0 JSON yang valid mencakup seluruh halaman dan komponen (Navbar, Hero, Telemetry, History Table, dan Admin).',
        `4. Tulis hasil akhir langsung ke file output: ${outputPath}`,
        '5. Website Layora sedang memantau file tersebut dan akan langsung merender kanvas secara real-time saat file tersimpan.',
      ],
      suggestedAntigravityPrompt: `Halo Antigravity! Tolong baca spesifikasi proyek Layora di file ini:
${inputPath}

Berdasarkan seluruh kode sumber di folder ${sourceRoot || sourcePath}, buatkan desain UI/UX lengkap dalam format Layora Design Schema v1.0.0 (1 single master canvas berdimensi 1440 × 2600 px berisi semua section: Navbar, Hero, Core Telemetry, History Table, dan Admin), lalu simpan hasilnya langsung ke file output:
${outputPath}

Pastikan struktur JSON valid: { "schemaVersion": "1.0.0", "document": { ... } }.`,
    };

    const inputJsonStr = JSON.stringify(inputContext, null, 2);
    await fs.writeFile(inputPath, inputJsonStr, 'utf-8');
    if (projectDir !== backupDir) {
      await fs.writeFile(path.join(backupDir, 'input_context.json'), inputJsonStr, 'utf-8').catch(() => {});
    }

    return res.json({
      success: true,
      projectId,
      projectDir,
      sourceRoot,
      inputPath,
      outputPath,
      relativeInputPath,
      relativeOutputPath,
      inputContext,
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to initialize exchange: ${err.message}` });
  }
});

app.get('/bridge/project-exchange/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    const {
      projectDir,
      sourceRoot,
      inputPath,
      outputPath,
      relativeInputPath,
      relativeOutputPath,
    } = await resolveProjectPaths(projectId);

    // Also check backup dir in case file exists there
    const backupDir = path.join(EXCHANGE_BASE_DIR, projectId);
    const backupInput = path.join(backupDir, 'input_context.json');
    const backupOutput = path.join(backupDir, 'design_output.json');

    let resolvedInput = inputPath;
    let inputExists = await fs.stat(inputPath).then(() => true).catch(() => false);
    if (!inputExists) {
      const backupInputExists = await fs.stat(backupInput).then(() => true).catch(() => false);
      if (backupInputExists) {
        inputExists = true;
        resolvedInput = backupInput;
      }
    }

    let resolvedOutput = outputPath;
    let outputExists = await fs.stat(outputPath).then(() => true).catch(() => false);
    if (!outputExists) {
      const backupOutputExists = await fs.stat(backupOutput).then(() => true).catch(() => false);
      if (backupOutputExists) {
        outputExists = true;
        resolvedOutput = backupOutput;
      }
    }

    let inputContext = null;
    if (inputExists) {
      try {
        const rawInput = await fs.readFile(resolvedInput, 'utf-8');
        inputContext = JSON.parse(rawInput);
      } catch {
        // ignore parsing err
      }
    }

    let outputDoc = null;
    let lastModified = null;
    let nodeCount = 0;

    if (outputExists) {
      const stat = await fs.stat(resolvedOutput);
      lastModified = stat.mtime.toISOString();
      const rawText = await fs.readFile(resolvedOutput, 'utf-8');
      if (rawText.trim()) {
        try {
          outputDoc = JSON.parse(rawText);
          const countNodes = (node) => {
            if (!node) return 0;
            let c = 1;
            if (Array.isArray(node.children)) {
              for (const child of node.children) c += countNodes(child);
            }
            return c;
          };
          if (outputDoc?.document?.children) {
            nodeCount = outputDoc.document.children.reduce((acc, n) => acc + countNodes(n), 0);
          }
        } catch {
          // If in the middle of being written, return raw or null
        }
      }
    }

    return res.json({
      projectId,
      inputExists,
      outputExists,
      lastModified,
      nodeCount,
      inputPath: resolvedInput,
      outputPath: resolvedOutput,
      relativeInputPath,
      relativeOutputPath,
      sourceRoot,
      inputContext,
      document: outputDoc,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/bridge/simulate-output/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    const { projectDir, inputPath, outputPath } = await resolveProjectPaths(projectId);
    await fs.mkdir(projectDir, { recursive: true });

    let inputContext = null;
    try {
      const raw = await fs.readFile(inputPath, 'utf-8');
      inputContext = JSON.parse(raw);
    } catch {
      // ignore
    }

    const title = inputContext?.projectName || 'Air Quality Monitoring Dashboard';
    const viewport = inputContext?.viewport || { width: 1440, height: 1024 };

    const simulatedSchema = {
      schemaVersion: '1.0.0',
      document: {
        id: `doc_${projectId}`,
        name: title,
        viewport,
        background: '#0F172A',
        children: [
          {
            id: 'navbar_root',
            type: 'FRAME',
            name: 'Navigation Bar',
            width: '100%',
            height: 68,
            layout: {
              mode: 'HORIZONTAL',
              alignment: 'SPACE_BETWEEN',
              crossAlignment: 'CENTER',
              padding: { top: 16, right: 32, bottom: 16, left: 32 },
            },
            style: {
              background: '#1E293B',
              border: { width: 1, color: '#334155', style: 'solid' },
            },
            children: [
              {
                id: 'brand_title',
                type: 'TEXT',
                name: 'Brand Title',
                text: `${title} · Layora AI Live Sync`,
                style: {
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#38BDF8',
                  fontFamily: 'Inter',
                },
              },
              {
                id: 'status_badge',
                type: 'TEXT',
                name: 'Status Badge',
                text: '🟢 Real-time Agent Synced',
                style: {
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#4ADE80',
                  background: 'rgba(74, 222, 128, 0.12)',
                  padding: { top: 6, right: 12, bottom: 6, left: 12 },
                  borderRadius: 20,
                  fontFamily: 'Inter',
                },
              },
            ],
          },
          {
            id: 'metrics_row',
            type: 'FRAME',
            name: 'Metrics Overview',
            width: '100%',
            layout: {
              mode: 'HORIZONTAL',
              gap: 20,
              alignment: 'START',
              crossAlignment: 'STRETCH',
              padding: { top: 24, right: 32, bottom: 20, left: 32 },
            },
            style: { background: 'transparent' },
            children: [
              {
                id: 'card_aqi',
                type: 'FRAME',
                name: 'AQI Index Card',
                width: 320,
                layout: { mode: 'VERTICAL', gap: 10, padding: 20 },
                style: {
                  background: '#1E293B',
                  borderRadius: 12,
                  border: { width: 1, color: '#334155', style: 'solid' },
                },
                children: [
                  {
                    id: 'aqi_label',
                    type: 'TEXT',
                    name: 'AQI Label',
                    text: 'Indeks Kualitas Udara (AQI)',
                    style: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
                  },
                  {
                    id: 'aqi_value',
                    type: 'TEXT',
                    name: 'AQI Value',
                    text: '42 · Sehat',
                    style: { fontSize: 32, color: '#4ADE80', fontWeight: '700' },
                  },
                ],
              },
              {
                id: 'card_pm25',
                type: 'FRAME',
                name: 'PM2.5 Card',
                width: 320,
                layout: { mode: 'VERTICAL', gap: 10, padding: 20 },
                style: {
                  background: '#1E293B',
                  borderRadius: 12,
                  border: { width: 1, color: '#334155', style: 'solid' },
                },
                children: [
                  {
                    id: 'pm25_label',
                    type: 'TEXT',
                    name: 'PM2.5 Label',
                    text: 'Partikel PM2.5 (ug/m3)',
                    style: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
                  },
                  {
                    id: 'pm25_value',
                    type: 'TEXT',
                    name: 'PM2.5 Value',
                    text: '12.4 ug/m3',
                    style: { fontSize: 32, color: '#38BDF8', fontWeight: '700' },
                  },
                ],
              },
              {
                id: 'card_co2',
                type: 'FRAME',
                name: 'CO2 Card',
                width: 320,
                layout: { mode: 'VERTICAL', gap: 10, padding: 20 },
                style: {
                  background: '#1E293B',
                  borderRadius: 12,
                  border: { width: 1, color: '#334155', style: 'solid' },
                },
                children: [
                  {
                    id: 'co2_label',
                    type: 'TEXT',
                    name: 'CO2 Label',
                    text: 'Konsentrasi CO2 (ppm)',
                    style: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
                  },
                  {
                    id: 'co2_value',
                    type: 'TEXT',
                    name: 'CO2 Value',
                    text: '418 ppm',
                    style: { fontSize: 32, color: '#FBBF24', fontWeight: '700' },
                  },
                ],
              },
            ],
          },
          {
            id: 'sensor_table_frame',
            type: 'FRAME',
            name: 'Sensor Stations Table',
            width: '100%',
            layout: {
              mode: 'VERTICAL',
              gap: 12,
              padding: { top: 20, right: 32, bottom: 32, left: 32 },
            },
            style: {
              background: '#1E293B',
              borderRadius: 12,
              border: { width: 1, color: '#334155', style: 'solid' },
            },
            children: [
              {
                id: 'table_title',
                type: 'TEXT',
                name: 'Table Title',
                text: 'Daftar Stasiun Pemantauan Udara Regional',
                style: { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },
              },
              {
                id: 'table_row_1',
                type: 'FRAME',
                name: 'Row 1',
                width: '100%',
                layout: {
                  mode: 'HORIZONTAL',
                  alignment: 'SPACE_BETWEEN',
                  crossAlignment: 'CENTER',
                  padding: 12,
                },
                style: {
                  background: '#0F172A',
                  borderRadius: 8,
                },
                children: [
                  {
                    id: 'station_name_1',
                    type: 'TEXT',
                    name: 'Station 1',
                    text: 'Stasiun Pusat Bandar Lampung',
                    style: { fontSize: 14, color: '#F1F5F9', fontWeight: '500' },
                  },
                  {
                    id: 'station_stat_1',
                    type: 'TEXT',
                    name: 'Status 1',
                    text: 'AQI 38 · Baik',
                    style: { fontSize: 13, color: '#4ADE80', fontWeight: '600' },
                  },
                ],
              },
              {
                id: 'table_row_2',
                type: 'FRAME',
                name: 'Row 2',
                width: '100%',
                layout: {
                  mode: 'HORIZONTAL',
                  alignment: 'SPACE_BETWEEN',
                  crossAlignment: 'CENTER',
                  padding: 12,
                },
                style: {
                  background: '#0F172A',
                  borderRadius: 8,
                },
                children: [
                  {
                    id: 'station_name_2',
                    type: 'TEXT',
                    name: 'Station 2',
                    text: 'Stasiun Industri Teluk Betung',
                    style: { fontSize: 14, color: '#F1F5F9', fontWeight: '500' },
                  },
                  {
                    id: 'station_stat_2',
                    type: 'TEXT',
                    name: 'Status 2',
                    text: 'AQI 72 · Sedang',
                    style: { fontSize: 13, color: '#FBBF24', fontWeight: '600' },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    await fs.writeFile(outputPath, JSON.stringify(simulatedSchema, null, 2), 'utf-8');
    const backupDir = path.join(EXCHANGE_BASE_DIR, projectId);
    if (projectDir !== backupDir) {
      await fs.mkdir(backupDir, { recursive: true });
      await fs.writeFile(path.join(backupDir, 'design_output.json'), JSON.stringify(simulatedSchema, null, 2), 'utf-8').catch(() => {});
    }

    return res.json({
      success: true,
      message: 'Simulated Antigravity output written to design_output.json',
      outputPath,
      schema: simulatedSchema,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

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
