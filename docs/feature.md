# Layora — Feature Specification

> **Product:** Layora  
> **Document:** Feature specification  
> **Version:** 0.1  
> **Status:** Initial scope

---

## 1. Product Goal

Layora helps programmers and product teams turn interface ideas, visual references, and existing websites into structured UI designs.

The product combines AI-agent flexibility with a visual design workspace. Users choose how AI runs, choose what source material to use, review and edit the generated result, then copy the design toward Figma.

The main product outcome is not a generated screenshot. It is a structured design document that can be rendered, edited, versioned, and converted through a tested export mechanism.

## 2. User Types

### 2.1 Programmer

Wants to convert an idea or an existing codebase into a design that can be reviewed and refined in Figma.

### 2.2 UI/UX Designer

Wants to explore interface directions, work from references, and refine generated layouts before continuing design work in Figma.

### 2.3 Product Builder

Wants to create multiple screens for an application while maintaining consistent layout rules and visual language.

These are usage profiles, not separate permission roles in the initial release.

---

## 3. Main User Journey

1. Open Layora.
2. Create a project.
3. Select an AI execution mode.
4. Configure or connect the selected agent.
5. Select a generation mode.
6. Provide prompt and references or source code.
7. Generate the design.
8. Review the result in the workspace.
9. Edit directly or request changes through AI chat.
10. Save a version.
11. Copy the design for Figma.
12. Paste into Figma and continue editing.

---

## 4. Feature Groups

## 4.1 Dashboard

**Purpose:** Provide an overview of the user's projects and recent activity.

Features:

- Recent projects.
- Create project action.
- Project search.
- Last modified information.
- Project thumbnail.
- Empty state for new users.
- Quick access to agent settings.
- Recent generation status.

Acceptance criteria:

- A user can create a project from the dashboard.
- A project can be reopened.
- The dashboard distinguishes active, failed, and completed tasks where relevant.
- Empty states explain the next useful action without decorative filler.

## 4.2 Project Management

Features:

- Create project.
- Rename project.
- Duplicate project.
- Delete project with confirmation.
- Set project description.
- Set target platform and viewport presets.
- Store project-level references.
- Store design documents and versions.

Project metadata:

- Project ID.
- Name.
- Description.
- Created date.
- Updated date.
- Generation mode.
- Selected agent ID.
- Design document IDs.
- Reference IDs.

Acceptance criteria:

- Project metadata remains separate from the design tree.
- Deleting a project clearly explains what associated data will be deleted.
- Duplicating a project creates independent editable documents.

## 4.3 AI Agent Configuration

**Purpose:** Let users decide which AI execution environment will handle generation and analysis.

### Execution mode A — Local AI

Features:

- Configure local runtime endpoint.
- Detect connection status.
- List or select available models when the runtime supports it.
- Configure model options supported by the runtime.
- Test connection.
- Show model capability information.
- Disconnect local runtime.

### Execution mode B — API AI

Features:

- Select provider.
- Configure API credentials.
- Select model.
- Test connection.
- Show supported capabilities.
- Configure generation settings where supported.
- Handle rate limits and provider errors.

Credentials must not be exposed in frontend logs or ordinary project exports.

### Execution mode C — External AI Agent

Features:

- Select a supported external agent.
- Show integration requirements.
- Connect using the supported method.
- Check connection status.
- Display supported capabilities.
- Provide a user-mediated prompt handoff if direct integration is unavailable.
- Disconnect agent.

Potential integrations include Codex, Claude Code, and Antigravity, subject to technical verification of each product's supported integration methods.

### Shared agent features

- Active agent indicator.
- Connection test.
- Capability summary.
- Task cancellation where supported.
- Task status.
- Clear error messages.
- Agent-specific configuration.

Acceptance criteria:

- Users can distinguish Local AI, API AI, and External AI Agent.
- Layora does not show a feature as supported unless the selected adapter supports it.
- A failed connection does not prevent access to projects or existing designs.

## 4.4 Generation Mode Selection

The user must choose one of two primary workflows.

### A. Create from Scratch

Features:

- Product or website description.
- Target platform.
- Target viewport.
- Page or screen description.
- Optional design direction.
- Optional constraints.
- Reference attachment.
- Generate action.

Optional prompt guidance:

- Product purpose.
- Intended users.
- Primary user task.
- Required content.
- Required components.
- Visual direction.
- Accessibility or responsive constraints.

Acceptance criteria:

- User can generate a first design from a prompt.
- References can be attached before generation.
- The generation task shows progress and validation status.
- The output is a valid Layora Design Schema document.

### B. Source Code to Design

Features:

- Select source type:
  - Local project directory.
  - ZIP archive.
  - Git repository.
  - Website URL.
- Select pages or routes where available.
- Select viewport.
- Select whether to inspect source structure, rendered output, or both.
- Review files and pages selected for analysis.
- Generate reconstructed design.
- Review visual differences.

Important requirements:

- Local directory access requires the local bridge and user permission.
- ZIP and repository ingestion must validate file types and size.
- Remote URLs must be handled with SSRF protections on any server-side fetch.
- Private repositories require an explicit supported authentication flow.
- Source code must not be executed without a controlled environment and explicit user consent.
- The system must not claim that source code alone guarantees an exact visual reconstruction.

Acceptance criteria:

- User can provide one supported source type.
- Layora displays what will be inspected.
- The resulting design is editable in the Layora workspace.
- The user can identify pages or routes that were not reconstructed.

## 4.5 Reference Manager

**Purpose:** Collect and organize source material used by generation tasks.

Reference types:

1. Visual reference — screenshot, image, or mockup.
2. Website reference — URL and selected page.
3. Design reference — supported design export or user-provided material.
4. Component reference — a specific component or pattern.
5. Brand reference — logo, palette, typography, and brand notes.
6. Source reference — selected files or source-code directory.

Features:

- Upload reference.
- Add URL.
- Add notes.
- Rename reference.
- Remove reference.
- Preview reference.
- Group references by project.
- Select which references apply to a generation task.

Acceptance criteria:

- Each reference has a visible type and source.
- Users can add multiple references to one task.
- The agent receives reference metadata and accessible content, not an unexplained attachment list.
- Missing or inaccessible references are reported before generation.

## 4.6 Design Workspace

**Purpose:** Review and refine the generated design.

Main areas:

- Project/page navigation.
- Design canvas.
- Layer hierarchy.
- Properties panel.
- AI conversation panel.
- Top action toolbar.

Features:

- Zoom in/out.
- Fit to screen.
- Pan canvas.
- Select node.
- Select parent or child.
- Show and hide layers.
- Rename layer.
- Reorder layers.
- Duplicate node.
- Delete node.
- Undo and redo.
- Switch viewport preset.
- Show generation status.
- Save version.
- Copy for Figma.

Acceptance criteria:

- Canvas output is derived from the canonical design schema.
- Selecting a node highlights the corresponding layer.
- Changes in properties update the schema and preview.
- Undo and redo restore prior document states.
- The user can navigate a multi-level hierarchy.

## 4.7 Visual Design Editor

Initial editable properties:

### Frame and layout

- Width and height.
- Vertical or horizontal layout.
- Padding.
- Gap.
- Main-axis alignment.
- Cross-axis alignment.
- Background fill.
- Border.
- Corner radius.
- Clipping.

### Text

- Text content.
- Font family, when available.
- Font size.
- Font weight.
- Line height.
- Letter spacing.
- Text alignment.
- Text color.
- Text wrapping behavior.

### Shape

- Fill.
- Stroke.
- Stroke width.
- Width and height.
- Corner radius.
- Opacity.

### Image

- Asset source.
- Width and height.
- Fit mode.
- Corner radius.
- Alt text or description.

Acceptance criteria:

- Each supported property has a clear control.
- Invalid values are rejected or normalized.
- Unsupported properties are not silently presented as editable.
- The editor does not directly mutate rendered DOM as its only state.

## 4.8 AI Design Chat

**Purpose:** Allow users to revise the current design through natural-language instructions.

Example requests:

- "Make the sidebar narrower."
- "Use a more compact card layout."
- "Change the primary color to dark blue."
- "Add a search field above the table."
- "Make the mobile layout stack vertically."
- "Keep the current typography but simplify the header."

Features:

- Conversation history per design.
- Context-aware revision.
- Selected-node context.
- Whole-page or selected-region scope.
- Revision preview.
- Accept or reject generated changes.
- Restore earlier version.

Acceptance criteria:

- AI revisions identify which nodes are changed.
- Unrelated nodes are preserved whenever possible.
- User edits are not overwritten without a clear confirmation or revision action.
- A revision can be accepted or rejected.
- The system records a version before applying a substantial revision.

## 4.9 Design System

Initial features:

- Color tokens.
- Typography tokens.
- Spacing tokens.
- Radius tokens.
- Shadow tokens.
- Reusable component definitions.
- Apply token to selected node.
- Update token references.

Later features:

- Component variants.
- Semantic tokens.
- Theme modes.
- Shared libraries.
- Design-system import and export.

Acceptance criteria:

- Tokens have stable IDs and names.
- Nodes can reference tokens rather than duplicate values.
- Updating a token updates all linked nodes in the document.

## 4.10 Figma Clipboard Export

**Purpose:** Transfer the Layora design into Figma using copy and paste.

Primary action label: **Copy to Figma**

Features:

- Export compatibility validation.
- Supported-node summary.
- Unsupported-property warnings.
- Clipboard copy.
- Copy success or failure feedback.
- Fallback export where available.
- Export diagnostics for troubleshooting.

Expected user flow:

1. User clicks Copy to Figma.
2. Layora validates the design.
3. Export adapter converts supported nodes.
4. Layora writes a verified clipboard representation.
5. User pastes into Figma.

Acceptance criteria:

- Export must be tested against actual Figma paste behavior.
- The result must be inspected for layer editability and hierarchy.
- The UI must disclose approximations and unsupported features.
- The product must not label SVG-only output as fully native editable design.
- Export compatibility must be tested for nested frames, text, shapes, images, and layout.

**MVP gate:** Do not consider the Figma export feature complete until the clipboard proof of concept passes its acceptance tests.

## 4.11 Version History

Features:

- Automatic snapshot before major AI revisions.
- Manual save version.
- Version list.
- Version name or note.
- Preview version.
- Restore version.
- Compare versions at document or node level where practical.

Acceptance criteria:

- Restoring a version does not destroy the version being replaced.
- Version history records the timestamp and operation source.
- The user can identify AI-generated and manually edited revisions.

## 4.12 Settings

Features:

- Theme preference.
- Default viewport.
- Default generation mode.
- Agent preferences.
- Local bridge connection.
- Storage information.
- Export preferences.
- Privacy and diagnostic settings.

---

## 5. Navigation Structure

Primary navigation:

- Dashboard
- Projects
- References
- AI Agents
- Design Systems
- Settings

Project workspace navigation:

- Overview
- Design
- References
- Versions
- Export

The workspace should prioritize the canvas. Secondary controls should remain available without overwhelming the design area.

---

## 6. Feature Priority

| Priority | Features |
|---|---|
| P0 — Foundation | Project model, design schema, validator, renderer |
| P0 — Core workflow | Create from Scratch, prompt, basic references |
| P0 — Editing | Layers, selection, properties, undo/redo |
| P0 — AI | One verified API adapter and one verified local integration |
| P0 — Export validation | Figma clipboard proof of concept |
| P1 — Source workflow | ZIP and local project analysis |
| P1 — Iteration | AI design chat and version history |
| P1 — Agent ecosystem | Additional external agent adapters |
| P2 — Design system | Tokens and reusable components |
| P2 — Advanced editing | Variants, responsive behavior, richer effects |
| P2 — Collaboration | Shared projects and multi-user editing |

Priorities describe product order, not a guarantee that all integrations can be delivered with equal effort.

---

## 7. Out of Scope for Initial Release

- Full replacement for Figma.
- Full vector illustration editor.
- Direct write access to Figma files.
- Guaranteed import of every CSS feature into native Figma Auto Layout.
- Automatic support for every AI agent.
- Unrestricted execution of user source code.
- Real-time multi-user collaboration.
- Complete mobile application design system authoring.

---

## 8. MVP Acceptance Checklist

### Foundation

- [ ] Create, rename, duplicate, and delete projects.
- [ ] Define and validate Layora Design Schema v1.
- [ ] Render a nested design tree.
- [ ] Save and reopen a project.

### AI

- [ ] Select execution mode.
- [ ] Configure a verified API provider.
- [ ] Connect a verified local runtime.
- [ ] Display capability and connection status.
- [ ] Generate valid schema output.
- [ ] Handle invalid output and provider failure.

### Design workflow

- [ ] Create from Scratch.
- [ ] Attach multiple image references.
- [ ] Preview generated design.
- [ ] Edit text, fills, spacing, and dimensions.
- [ ] Navigate layers.
- [ ] Undo and redo.

### Figma export

- [ ] Build clipboard proof of concept.
- [ ] Test actual paste in Figma.
- [ ] Verify individual layer editability.
- [ ] Verify text editability.
- [ ] Record layout preservation limitations.
- [ ] Show compatibility warnings.

### Source Code to Design

- [ ] Select an approved source directory or ZIP.
- [ ] Display inspected files.
- [ ] Identify routes and components where possible.
- [ ] Generate a reconstructed design.
- [ ] Report incomplete or uncertain reconstruction.

---

## 9. Product Success Measures

Track measurable product behavior:

- Time from project creation to first rendered design.
- Percentage of generation tasks producing valid schema.
- Percentage of generated designs requiring manual structural repair.
- Time to complete a design revision.
- Clipboard export success rate in tested Figma environments.
- Percentage of exported nodes that remain individually editable.
- Percentage of text nodes that remain editable.
- Source reconstruction coverage by page or route.
- Agent connection success rate by adapter.

Do not use visual similarity alone as the measure of export quality. Layer structure and editability are separate outcomes.
