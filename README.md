# Layora — AI-Powered Design Workspace

> **Product:** Layora (`v0.1.0`)  
> **Positioning:** Transform interface prompts, visual references, and existing source code into validated **Layora Design Schema** documents that can be rendered, visually edited, versioned, and copied to Figma as individually editable layers.

---

## 1. Architecture & Core Principles

Layora is built on a **Schema-First Architecture**:
- AI output is **never** treated as raw, unstructured HTML or a static bitmap screenshot.
- Every generated or reconstructed screen is validated with **Zod** against the canonical **Layora Design Schema v1.0.0** (`src/core/design-schema/schema.js`).
- The same JSON schema powers the **DOM Interactive Renderer**, **Visual Design Editor**, **AI Conversational Revision Engine**, **Version History**, **Design System Token Resolver**, and **Figma Clipboard Exporter**.

```text
layora/
├── docs/
│   ├── architecture.md
│   ├── design.md
│   └── feature.md
├── src/
│   ├── app/                  # Application router & store bootstrapper
│   ├── components/shared/    # Compact global navigation shell
│   ├── core/
│   │   ├── design-schema/    # Canonical Schema v1.0.0, tree operations, sample docs
│   │   ├── validator/        # Zod schema validator, auto-normalizer & repair engine
│   │   ├── renderer/         # Isolated DOM Flexbox renderer & token resolver
│   │   ├── exporters/        # Deterministic layout solver & Figma clipboard exporter
│   │   └── __tests__/        # Functional test suite (Vitest)
│   ├── features/
│   │   ├── dashboard/        # Project overview, search, agent status & activity feed
│   │   ├── projects/         # Guided project creation & workspace settings
│   │   ├── ai-agents/        # Local AI, API AI & External Agent adapter management
│   │   ├── references/       # Reference Manager (Visual, URL, Design, Component, Brand, Source)
│   │   ├── design-canvas/    # 3-region Design Workspace & SVG selection/resize overlay
│   │   ├── design-editor/    # Recursive Layer Tree & Properties Inspector
│   │   ├── design-chat/      # Context-aware AI Design Chat with diff review state
│   │   ├── design-system/    # Color, Typography, Spacing, Radius tokens & reusable components
│   │   ├── version-history/  # Automatic pre-revision snapshots & manual version checkpoints
│   │   └── figma-export/     # Compatibility report & Figma clipboard export modal
│   ├── services/
│   │   ├── ai-providers/     # System prompts, context builder & deterministic schema synthesizer
│   │   ├── agent-adapters/   # Unified adapter registry for Local, API & External agents
│   │   ├── local-bridge/     # ZIP archive & approved directory Source-Code-to-Design analyzer
│   │   └── storage/          # IndexedDB local persistence wrapper with memory fallback
│   ├── stores/               # Zustand state stores
│   └── styles/               # Light & Dark theme design tokens (Inter + 4px spacing scale)
├── server/
│   └── index.js              # Loopback Express API proxy & Local Bridge service
├── local-bridge/
│   └── index.js              # Standalone Local Bridge entrypoint
├── .env.example              # Environment configuration template (no secrets)
└── package.json
```

---

## 2. Installation & Setup

### Prerequisites
- **Node.js** `>= 18.x` (verified on Node `v22.x`)
- **npm** `>= 9.x`

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` if you want to pre-configure provider API keys or custom ports on the local backend server:
```bash
cp .env.example .env
```
*(You can also configure API keys and local endpoints directly inside the **AI Agents** screen in the UI.)*

### 3. Start Backend & Local Bridge Service
In one terminal, start the local backend & bridge server (`http://127.0.0.1:3001`):
```bash
npm run server
```

### 4. Start Frontend Development Server
In a second terminal, start the Vite frontend (`http://localhost:5173`):
```bash
npm run dev
```

### 5. Run Functional Tests & Production Build
```bash
npm test
npm run build
```

---

## 3. Implemented Features

### A. Three AI Execution Modes (`src/services/agent-adapters/agentRegistry.js`)
1. **Local AI**:
   - **Layora Built-in Schema Synthesizer**: Deterministic rule-based offline engine that runs 100% locally in-browser with zero external API keys required.
   - **Ollama Local Runtime (`http://127.0.0.1:11434`)**: Live connection verification (`/api/tags`), model discovery, and JSON schema generation (`/api/chat`).
   - **LM Studio / OpenAI-Compatible Local Runtime (`http://127.0.0.1:1234/v1`)**: Connects to `/v1/models` and `/v1/chat/completions`.
2. **API AI**:
   - **Google Gemini API** (`gemini-2.5-flash`, `gemini-2.5-pro`) with native `application/json` structured output.
   - **OpenAI API** (`gpt-4o-mini`, `gpt-4o`) with `json_object` response format.
   - **Anthropic Claude API** (`claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest`) routed safely via the local backend proxy.
3. **External AI Agent**:
   - **Antigravity**, **Claude Code CLI**, and **Codex CLI** adapters with allowlisted binary detection via the Local Bridge and a complete **Prompt & Schema Handoff Contract** (copy structured Layora Design Schema v1 prompt, paste external agent JSON output, validate with Zod, and render directly on the canvas).

### B. Design Generation Workflows
1. **Create from Scratch**:
   - Guided setup for Project Details, Target Platform (`Web`, `Tablet`, `Mobile`), Viewport Presets, AI Execution Mode, and Attached Project References.
2. **Source Code to Design (`src/services/local-bridge/sourceCodeAnalyzer.js`)**:
   - Supports **ZIP Archives** (inspected in-memory with `JSZip` without executing untrusted code), **Approved Local Directories** (via Local Bridge with path-traversal protection), **Git Repositories**, and **Website URLs** (with SSRF protection blocking private network addresses).
   - Detects frameworks (`React`, `Next.js`, `Vue`, `Svelte`, `Tailwind CSS`), discovers routes & components, extracts hex color tokens, and reconstructs multi-page Layora Design Schema documents.

### C. Design Workspace, Visual Editor & AI Design Chat
- **Left Panel**: Multi-page switcher, `+ Add Page`, layer search, recursive Layer Tree with node-type icons, double-click inline rename, visibility/lock toggles, and layer reordering.
- **Center Interactive Canvas**: Zoom (`25%–250%`), Pan (`Hand` tool), Viewport presets, isolated DOM Flexbox renderer, and a separate **SVG Selection Overlay** with 8 interactive resize handles, dimension badge, hover outline, and center alignment guides.
- **Right Panel**:
  - **Properties Inspector**: Edit width/height (`FIXED`, `FILL`, `HUG`), X/Y offset, Flexbox layout (`VERTICAL`, `HORIZONTAL`, `NONE`), gap, 4-side padding, alignment, typography, colors, border radius, opacity, image fit, and Design System Token links.
  - **AI Design Chat**: Supports `Whole Page` or `Selected Node` scope, quick revision prompts, and a **Revision Review Banner** showing affected nodes with **Apply Changes** (auto-saving a version snapshot first) or **Discard**.
  - **Version History**: Automatic snapshots before AI revisions or restores, plus manual version checkpoints with notes.

### D. Figma Clipboard Export (`src/core/exporters/figmaExporter.js`)
- **Pre-Export Compatibility Report**: Inspects the document tree before copying, reporting total supported nodes (`FRAME`, `TEXT`, `RECTANGLE`, `ELLIPSE`, `IMAGE`, `VECTOR`, `GROUP`, `COMPONENT_INSTANCE`) and disclosing approximations.
- **Clipboard Payload**: Writes a Figma-targeted semantic SVG representation (`text/plain` + `text/html` via `ClipboardItem`) where frames map to `<g id="...">` with `<clipPath>`, shapes map to `<rect>` / `<ellipse>`, and text maps to editable `<text>` / `<tspan>` layers at exact resolved layout coordinates.
- **Fallback Downloads**: Provides explicit `.svg` and `.layora.json` downloads.

---

## 4. Known Technical Limitations & Honesty Disclosures

1. **Figma Auto Layout via Clipboard**: As documented in `architecture.md` Section 1.1 & 9.3, Figma does not expose a public clipboard API for native Auto Layout frames. When pasting Layora's clipboard output (`Ctrl + V`) into Figma, layers, nested groups/frames, shapes, and editable `<text>` nodes are positioned using resolved static coordinates rather than native Figma Auto Layout.
2. **Source Code to Design Static Analysis**: Source code inspection parses file structure, templates, and stylesheets statically without executing arbitrary user code. Runtime state, authenticated API responses, and dynamic client-side hooks are represented using structured placeholders.
3. **External Agent CLI Automation**: Direct CLI invocation for Claude Code or Codex requires the respective CLI binary to be installed and authenticated in the user's system `PATH` and connected via `npm run server`. When a binary is not installed locally, the **Verified Prompt & Schema Handoff** workflow is used instead.
