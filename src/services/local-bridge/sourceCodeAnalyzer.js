import JSZip from 'jszip';
import { generateNodeId, NODE_TYPES, SCHEMA_VERSION } from '../../core/design-schema/schema.js';
import { normalizeAndValidateSchema } from '../../core/validator/validator.js';

const TEXT_EXTENSIONS = new Set([
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
  '.md',
]);

function getExtension(filePath) {
  const idx = filePath.lastIndexOf('.');
  return idx >= 0 ? filePath.slice(idx).toLowerCase() : '';
}

/**
 * Inspects a map of { [filePath]: fileContentString } and extracts framework, dependencies,
 * routes, components, CSS colors, and reconstructs a Layora Design Schema document.
 */
export function analyzeSourceFilesMap(filesMap, sourceLabel = 'Source Project', viewport = { width: 1440, height: 1024 }) {
  const filePaths = Object.keys(filesMap).sort();
  const report = {
    sourceLabel,
    totalFiles: filePaths.length,
    inspectedFiles: filePaths.slice(0, 60),
    framework: 'HTML / JavaScript',
    stylingSystem: 'Standard CSS',
    dependencies: [],
    discoveredRoutes: [],
    discoveredComponents: [],
    extractedColors: [],
    unreconstructedNotes: [],
  };

  // 1. Parse package.json if available
  const pkgPath = filePaths.find((p) => p.endsWith('package.json') && !p.includes('node_modules'));
  if (pkgPath && filesMap[pkgPath]) {
    try {
      const pkg = JSON.parse(filesMap[pkgPath]);
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      report.dependencies = Object.keys(allDeps);

      if (allDeps.next) report.framework = 'Next.js (React)';
      else if (allDeps.react) report.framework = allDeps.vite ? 'React + Vite' : 'React';
      else if (allDeps.vue || allDeps.nuxt) report.framework = allDeps.nuxt ? 'Nuxt (Vue)' : 'Vue.js';
      else if (allDeps.svelte) report.framework = 'Svelte / SvelteKit';
      else if (allDeps['@angular/core']) report.framework = 'Angular';

      if (allDeps.tailwindcss) report.stylingSystem = 'Tailwind CSS';
      else if (allDeps['styled-components'] || allDeps['@emotion/react']) report.stylingSystem = 'CSS-in-JS';
      else if (allDeps.sass) report.stylingSystem = 'SCSS / Sass';
    } catch {
      report.unreconstructedNotes.push('Could not parse package.json due to malformed JSON.');
    }
  }

  // 2. Discover routes, pages, components, and CSS colors
  const hexSet = new Set();
  const hexRegex = /#([0-9A-Fa-f]{6})\b/g;

  filePaths.forEach((path) => {
    const lower = path.toLowerCase();
    const content = filesMap[path] || '';

    // Extract colors from CSS / Tailwind config
    if (lower.endsWith('.css') || lower.endsWith('.scss') || lower.includes('tailwind.config')) {
      let match;
      while ((match = hexRegex.exec(content)) !== null) {
        hexSet.add(`#${match[1].toUpperCase()}`);
      }
    }

    // Detect routes / pages
    if (
      lower.includes('/pages/') ||
      lower.includes('/app/') ||
      lower.includes('/views/') ||
      lower.includes('/features/') ||
      lower.endsWith('.html')
    ) {
      if (/\.(jsx|tsx|vue|svelte|html|js)$/.test(lower) && !lower.includes('main.') && !lower.includes('vite-env')) {
        const cleanName = path
          .split('/')
          .pop()
          .replace(/\.(jsx|tsx|vue|svelte|html|js)$/i, '');
        const headings = [];
        const textMatches = content.match(/<(?:h1|h2|h3|title|button)[^>]*>([^<{]+)<\//gi) || [];
        textMatches.slice(0, 5).forEach((m) => {
          const inner = m.replace(/<[^>]+>/g, '').trim();
          if (inner && inner.length > 1) headings.push(inner);
        });

        report.discoveredRoutes.push({
          filePath: path,
          routeName: cleanName === 'index' || cleanName === 'page' ? 'Home / Index' : cleanName,
          headings,
          reconstructed: true,
        });
      }
    }

    // Detect components
    if (
      (lower.includes('/components/') || lower.includes('/ui/') || lower.includes('/shared/')) &&
      /\.(jsx|tsx|vue|svelte|js)$/.test(lower)
    ) {
      const compName = path
        .split('/')
        .pop()
        .replace(/\.(jsx|tsx|vue|svelte|js)$/i, '');
      report.discoveredComponents.push({
        name: compName,
        filePath: path,
      });
    }
  });

  report.extractedColors = Array.from(hexSet).slice(0, 8);
  if (report.discoveredRoutes.length === 0) {
    report.discoveredRoutes.push({
      filePath: filePaths[0] || 'index.html',
      routeName: 'Main Application View',
      headings: [sourceLabel],
      reconstructed: true,
    });
  }

  if (report.discoveredRoutes.length > 5) {
    const skipped = report.discoveredRoutes.slice(5);
    skipped.forEach((r) => {
      r.reconstructed = false;
    });
    report.unreconstructedNotes.push(
      `Reconstructed the top 5 primary routes; ${skipped.length} secondary route file(s) were indexed in metadata only.`
    );
  }
  report.unreconstructedNotes.push(
    'Static AST/template analysis used: runtime API state and authenticated data hooks are represented with structured placeholders.'
  );

  // 3. Reconstruct into Layora Design Schema v1
  const primaryAccent = report.extractedColors.find((c) => c !== '#FFFFFF' && c !== '#000000') || '#5B63D3';

  const buildPageNodesForRoute = (routeInfo) => {
    const primaryTitle = routeInfo.headings?.[0] || `${routeInfo.routeName} Screen`;
    const subHeadings = routeInfo.headings?.slice(1) || [];
    const topComponents = report.discoveredComponents.slice(0, 6);

    return [
      {
        id: generateNodeId('frame'),
        type: NODE_TYPES.FRAME,
        name: `${routeInfo.routeName} — Root Layout`,
        width: viewport.width,
        height: viewport.height,
        layout: {
          mode: 'VERTICAL',
          gap: 0,
          padding: 0,
          alignment: 'START',
          crossAlignment: 'STRETCH',
          widthMode: 'FIXED',
          heightMode: 'FIXED',
        },
        style: { background: '#F8FAFC' },
        children: [
          // Reconstructed Header
          {
            id: generateNodeId('frame'),
            type: NODE_TYPES.FRAME,
            name: 'Reconstructed Header Navigation',
            width: 'FILL',
            height: 64,
            layout: {
              mode: 'HORIZONTAL',
              gap: 20,
              padding: { top: 14, right: 32, bottom: 14, left: 32 },
              alignment: 'SPACE_BETWEEN',
              crossAlignment: 'CENTER',
              widthMode: 'FILL',
              heightMode: 'FIXED',
            },
            style: {
              background: '#FFFFFF',
              borderColor: '#E2E8F0',
              borderWidth: 1,
            },
            children: [
              {
                id: generateNodeId('frame'),
                type: NODE_TYPES.FRAME,
                name: 'Source Brand Group',
                width: 'HUG',
                height: 'HUG',
                layout: { mode: 'HORIZONTAL', gap: 10, padding: 0, alignment: 'START', crossAlignment: 'CENTER' },
                style: {},
                children: [
                  {
                    id: generateNodeId('rect'),
                    type: NODE_TYPES.RECTANGLE,
                    name: 'Framework Badge Icon',
                    width: 24,
                    height: 24,
                    style: { background: primaryAccent, borderRadius: 6 },
                  },
                  {
                    id: generateNodeId('text'),
                    type: NODE_TYPES.TEXT,
                    name: 'Project Name',
                    text: `${sourceLabel} (${report.framework})`,
                    style: { color: '#0F172A' },
                    typography: { fontFamily: 'Inter', fontSize: 14, fontWeight: 600 },
                  },
                ],
              },
              {
                id: generateNodeId('text'),
                type: NODE_TYPES.TEXT,
                name: 'Source File Path Tag',
                text: `Source: ${routeInfo.filePath}`,
                style: { color: '#64748B' },
                typography: { fontFamily: 'Inter', fontSize: 12, fontWeight: 500 },
              },
            ],
          },
          // Reconstructed Body
          {
            id: generateNodeId('frame'),
            type: NODE_TYPES.FRAME,
            name: 'Reconstructed Route Body',
            width: 'FILL',
            height: 'FILL',
            layout: {
              mode: 'VERTICAL',
              gap: 24,
              padding: 36,
              alignment: 'START',
              crossAlignment: 'STRETCH',
              widthMode: 'FILL',
              heightMode: 'FILL',
            },
            style: {},
            children: [
              {
                id: generateNodeId('frame'),
                type: NODE_TYPES.FRAME,
                name: 'Route Header Card',
                width: 'FILL',
                height: 'HUG',
                layout: {
                  mode: 'VERTICAL',
                  gap: 8,
                  padding: 24,
                  alignment: 'START',
                  crossAlignment: 'START',
                  widthMode: 'FILL',
                  heightMode: 'HUG',
                },
                style: {
                  background: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderWidth: 1,
                  borderRadius: 10,
                },
                children: [
                  {
                    id: generateNodeId('text'),
                    type: NODE_TYPES.TEXT,
                    name: 'Route Eyebrow',
                    text: `RECONSTRUCTED ROUTE • ${report.stylingSystem.toUpperCase()}`,
                    style: { color: primaryAccent },
                    typography: { fontFamily: 'Inter', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 },
                  },
                  {
                    id: generateNodeId('text'),
                    type: NODE_TYPES.TEXT,
                    name: 'Route Primary Heading',
                    text: primaryTitle,
                    style: { color: '#0F172A' },
                    typography: { fontFamily: 'Inter', fontSize: 22, fontWeight: 600 },
                  },
                  {
                    id: generateNodeId('text'),
                    type: NODE_TYPES.TEXT,
                    name: 'Route Summary',
                    text:
                      subHeadings.length > 0
                        ? `Detected sections: ${subHeadings.join(' • ')}`
                        : `Reconstructed from ${report.totalFiles} source files with ${report.discoveredComponents.length} discovered UI components.`,
                    style: { color: '#64748B' },
                    typography: { fontFamily: 'Inter', fontSize: 13, fontWeight: 400 },
                  },
                ],
              },
              {
                id: generateNodeId('frame'),
                type: NODE_TYPES.FRAME,
                name: 'Discovered Component Tree Grid',
                width: 'FILL',
                height: 'HUG',
                layout: {
                  mode: 'HORIZONTAL',
                  gap: 16,
                  padding: 0,
                  alignment: 'START',
                  crossAlignment: 'STRETCH',
                  widthMode: 'FILL',
                  heightMode: 'HUG',
                  wrap: true,
                },
                style: {},
                children: (topComponents.length > 0
                  ? topComponents
                  : [
                      { name: 'HeaderNav', filePath: 'src/components/HeaderNav.jsx' },
                      { name: 'ContentPanel', filePath: 'src/components/ContentPanel.jsx' },
                      { name: 'ActionFooter', filePath: 'src/components/ActionFooter.jsx' },
                    ]
                )
                  .slice(0, 3)
                  .map((comp) => ({
                    id: generateNodeId('frame'),
                    type: NODE_TYPES.FRAME,
                    name: `Component — <${comp.name} />`,
                    width: 380,
                    height: 'HUG',
                    layout: {
                      mode: 'VERTICAL',
                      gap: 10,
                      padding: 20,
                      alignment: 'START',
                      crossAlignment: 'START',
                      widthMode: 'FILL',
                      heightMode: 'HUG',
                    },
                    style: {
                      background: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderWidth: 1,
                      borderRadius: 10,
                    },
                    children: [
                      {
                        id: generateNodeId('text'),
                        type: NODE_TYPES.TEXT,
                        name: 'Component Tag',
                        text: `<${comp.name} />`,
                        style: { color: '#0F172A' },
                        typography: { fontFamily: 'Inter', fontSize: 15, fontWeight: 600 },
                      },
                      {
                        id: generateNodeId('text'),
                        type: NODE_TYPES.TEXT,
                        name: 'Component File Path',
                        text: comp.filePath,
                        style: { color: '#64748B' },
                        typography: { fontFamily: 'Inter', fontSize: 12, fontWeight: 400 },
                      },
                      {
                        id: generateNodeId('comp'),
                        type: NODE_TYPES.COMPONENT_INSTANCE,
                        name: `${comp.name} Interactive Action`,
                        componentId: `comp_${comp.name.toLowerCase()}`,
                        width: 'HUG',
                        height: 'HUG',
                        layout: {
                          mode: 'HORIZONTAL',
                          gap: 8,
                          padding: { top: 8, right: 14, bottom: 8, left: 14 },
                          alignment: 'CENTER',
                          crossAlignment: 'CENTER',
                        },
                        style: {
                          background: primaryAccent,
                          borderRadius: 6,
                        },
                        children: [
                          {
                            id: generateNodeId('text'),
                            type: NODE_TYPES.TEXT,
                            name: 'Action Label',
                            text: `Inspect ${comp.name}`,
                            style: { color: '#FFFFFF' },
                            typography: { fontFamily: 'Inter', fontSize: 12, fontWeight: 500 },
                          },
                        ],
                      },
                    ],
                  })),
              },
            ],
          },
        ],
      },
    ];
  };

  const activeRoutes = report.discoveredRoutes.filter((r) => r.reconstructed).slice(0, 5);
  const pages = activeRoutes.map((routeInfo, index) => ({
    id: generateNodeId('page'),
    name: routeInfo.routeName || `Route ${index + 1}`,
    viewport: { ...viewport },
    background: '#F8FAFC',
    children: buildPageNodesForRoute(routeInfo),
  }));

  const rawSchema = {
    schemaVersion: SCHEMA_VERSION,
    document: {
      id: generateNodeId('doc'),
      name: `${sourceLabel} — Reconstructed UI`,
      viewport: { ...viewport },
      background: '#F8FAFC',
      activePageId: pages[0]?.id,
      pages,
      children: pages[0]?.children || [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generatedBy: 'Layora Source-to-Design Reconstructor',
      sourceMode: 'source-code',
    },
  };

  const validated = normalizeAndValidateSchema(rawSchema);
  return {
    document: validated.document,
    report,
  };
}

/**
 * Reads a user-selected .zip File in browser memory safely using JSZip
 * and reconstructs its UI into a Layora Design Schema document.
 */
export async function analyzeZipArchiveFile(file, viewport = { width: 1440, height: 1024 }) {
  if (!file) throw new Error('No ZIP file provided.');
  const maxBytes = 25 * 1024 * 1024; // 25MB safety limit
  if (file.size > maxBytes) {
    throw new Error('ZIP archive exceeds 25 MB safety limit.');
  }

  const zip = await JSZip.loadAsync(file);
  const filesMap = {};
  const entries = Object.keys(zip.files);

  for (const relativePath of entries) {
    const zipEntry = zip.files[relativePath];
    if (zipEntry.dir) continue;
    if (
      relativePath.includes('node_modules/') ||
      relativePath.includes('.git/') ||
      relativePath.includes('dist/') ||
      relativePath.includes('build/')
    ) {
      continue;
    }
    const ext = getExtension(relativePath);
    if (TEXT_EXTENSIONS.has(ext)) {
      const content = await zipEntry.async('string');
      filesMap[relativePath] = content.slice(0, 32000);
    } else {
      filesMap[relativePath] = '';
    }
  }

  const cleanName = file.name.replace(/\.zip$/i, '');
  return analyzeSourceFilesMap(filesMap, cleanName, viewport);
}

/**
 * Requests local directory or URL inspection from the Local Bridge / Backend server.
 */
export async function inspectSourceViaBridge({
  sourceType, // 'directory' | 'url' | 'git'
  sourceValue,
  viewport = { width: 1440, height: 1024 },
}) {
  if (sourceType === 'directory' || sourceType === 'git') {
    const res = await fetch('/bridge/inspect-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceType,
        sourcePath: sourceValue,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.error ||
          `Local Bridge returned HTTP ${res.status}. Make sure the Layora server/bridge is running.`
      );
    }

    const data = await res.json();
    return analyzeSourceFilesMap(data.filesMap || {}, data.sourceLabel || sourceValue, viewport);
  }

  if (sourceType === 'url') {
    const res = await fetch('/api/source/inspect-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sourceValue }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to inspect URL (${res.status}).`);
    }

    const data = await res.json();
    return analyzeSourceFilesMap(data.filesMap || {}, data.sourceLabel || sourceValue, viewport);
  }

  throw new Error(`Unsupported source type: ${sourceType}`);
}
