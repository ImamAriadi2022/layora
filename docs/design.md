# Layora — Design Direction

> **Product:** Layora  
> **Document:** Visual design direction and interface guidelines  
> **Version:** 0.1  
> **Design principle:** A focused workspace for making and refining interface designs.  
> **Important:** This document describes the intended product UI, not a pre-existing visual system to imitate.

---

## 1. Design Intent

Layora should feel like a professional tool used during real product work. It should not look like a generic AI landing page, a chatbot wrapped around a canvas, or a dashboard assembled from decorative cards.

The interface must give the design itself the most visual importance. Controls should be discoverable, compact, and predictable. The user should understand where the current project is, which page is being edited, what is selected, and what will happen when an action is triggered.

### 1.1 Desired qualities

- Calm and precise.
- Tool-like rather than promotional.
- Dense enough for professional work, but not cramped.
- Clear hierarchy between canvas, layers, properties, and AI conversation.
- Consistent spacing and alignment.
- Neutral surfaces that do not compete with generated designs.
- Strong interaction feedback without decorative effects.

### 1.2 Avoid

- Unnecessary gradients.
- Glowing borders and neon accents.
- Excessive rounded cards.
- Decorative blobs, floating shapes, and abstract AI imagery.
- Large empty hero sections inside the actual workspace.
- Excessive badges and status pills.
- Emoji used as interface icons.
- Random glassmorphism.
- Oversized headings in utility panels.
- Every section being placed inside a separate card.
- Fake charts or decorative statistics that do not help users work.

The interface should be visually restrained. Generated designs may use any appropriate visual language; the Layora workspace should remain neutral so that it does not impose its own style on the output.

---

## 2. Visual Direction

### 2.1 Overall direction

Use a restrained, modern desktop application aesthetic inspired by professional creative and development tools. Do not copy another product's exact layout, icons, or styling.

The main workspace should use a three-region structure:

1. **Left rail and panel:** project navigation, pages, and layers.
2. **Center:** canvas and viewport controls.
3. **Right panel:** selected-node properties or AI conversation.

The panels should be resizable where practical. The canvas must retain the largest share of the available width.

### 2.2 Theme

Support light and dark themes. Both themes must be designed intentionally rather than treating dark mode as a color inversion.

Suggested default: light theme for first-time users, with a persistent theme preference. A dark theme can be selected by the user.

### 2.3 Color system

Use neutral surfaces and one restrained accent color.

Suggested starting tokens:

| Token | Light theme | Dark theme | Use |
|---|---|---|---|
| `app-bg` | `#F5F6F8` | `#17191D` | Application background |
| `panel-bg` | `#FFFFFF` | `#202329` | Main panels |
| `panel-muted` | `#F0F1F4` | `#292D34` | Secondary panel surface |
| `canvas-bg` | `#E9EBEF` | `#111318` | Work area around the design |
| `border` | `#E1E4E8` | `#343942` | Dividers and outlines |
| `text-primary` | `#20242B` | `#F1F3F5` | Main text |
| `text-secondary` | `#69717D` | `#A4ABB5` | Supporting text |
| `text-muted` | `#9299A4` | `#7E8793` | Low-emphasis metadata |
| `accent` | `#5B63D3` | `#858BFF` | Primary actions and focus |
| `success` | `#21845A` | `#48B887` | Success states |
| `warning` | `#A96A16` | `#E5AC54` | Warnings |
| `danger` | `#C44949` | `#EF7777` | Destructive or error states |

These values are initial design tokens, not immutable brand requirements. Check text contrast before implementation, especially for muted text and small labels.

Use accent color selectively. Most workspace surfaces should remain neutral.

### 2.4 Typography

Use a highly legible sans-serif typeface. A practical initial choice is Inter, with system sans-serif fallbacks.

Suggested scale:

| Role | Size | Weight |
|---|---:|---:|
| Page title | 20–24 px | 600 |
| Panel title | 13–15 px | 600 |
| Body | 13–14 px | 400 |
| Secondary text | 12–13 px | 400 |
| Field label | 11–12 px | 500 |
| Small metadata | 11 px | 400 |
| Button label | 12–13 px | 500 |

Avoid using too many font sizes or weights in the same panel. The workspace is information-dense; typography should make hierarchy obvious without visual noise.

### 2.5 Spacing and geometry

Use a consistent 4 px base spacing scale.

Suggested values:

- 4 px: icon-to-label spacing or tiny internal gaps.
- 8 px: compact control spacing.
- 12 px: standard control groups.
- 16 px: panel content padding.
- 20–24 px: larger section separation.
- 32 px: major workspace grouping.

Suggested geometry:

- Inputs and compact buttons: 6–8 px radius.
- Menus and popovers: 8 px radius.
- Panels: mostly square or 8 px radius depending on separation.
- Avoid rounding every individual control excessively.
- Use 1 px borders for panel separation.
- Use shadows only for floating elements such as menus, dialogs, and popovers.

---

## 3. Application Shell

### 3.1 Main layout

The desktop shell consists of:

- A compact global navigation rail.
- A project or page panel.
- A central work area.
- A contextual inspector panel.

Do not make all four regions permanently wide. The global navigation rail should be narrow, while the side panels can collapse or resize.

### 3.2 Global navigation

Primary destinations:

- Dashboard.
- Projects.
- References.
- AI Agents.
- Design Systems.
- Settings.

Use consistent line icons. Every icon-only control must have a tooltip and accessible label.

The active destination should be clear through a restrained background or indicator, not a large colorful tile.

### 3.3 Header

The header should show only information and actions relevant to the current location.

In a project workspace, include:

- Project name.
- Current page or design name.
- Save status.
- Undo and redo.
- Viewport or zoom controls.
- Copy to Figma action.

Avoid placing every possible action in the header. Less frequent actions belong in contextual menus.

---

## 4. Dashboard

The dashboard is a starting point, not an analytics product.

### Layout

- Page title and concise welcome text.
- Primary action: New Project.
- Recent projects list or grid.
- Recent activity, only if it provides useful context.
- Agent connection status in a compact area.

### Project item

Show:

- Project thumbnail.
- Project name.
- Last modified time.
- Design mode or project type.
- Overflow menu.

Do not fill project cards with fake percentages, decorative charts, or unnecessary metadata.

### Empty state

When no projects exist:

- Explain what the user can create.
- Show one primary New Project action.
- Optionally show a short example prompt.
- Avoid large decorative illustrations that push the action below the fold.

---

## 5. New Project Flow

Use a guided setup that reveals only the next relevant decision.

### Step 1 — Project details

Fields:

- Project name.
- Short description, optional.
- Target platform: Web, Mobile, or Tablet.

### Step 2 — AI execution mode

Present three distinct choices:

**Local AI**
- Runs through a local model or local runtime.
- Show connection status and model selection where supported.

**API AI**
- Uses a hosted model provider.
- Show provider, model, and credential configuration.

**External AI Agent**
- Connects to an existing agent environment.
- Show the supported integration method and its requirements.

Do not use vague labels such as "Fast AI" or "Smart AI". Users need to know where execution happens and what they must configure.

### Step 3 — Generation mode

Two primary choices:

**Create from Scratch**
- Start from a prompt.
- Add optional references.
- Define page and viewport requirements.

**Source Code to Design**
- Provide a local directory, ZIP, repository, or website URL.
- Explain required permissions and supported input types.

### Step 4 — Configure and create

Summarize the selected project settings before creation. Do not force users through unnecessary steps if a setting can be configured later.

---

## 6. Design Workspace

The workspace is the most important screen in Layora. It should be designed before secondary settings pages.

### 6.1 Workspace regions

#### Left panel

Contains:

- Page list.
- Layer tree.
- Search layers.
- Add page.
- Expand and collapse hierarchy.
- Visibility and lock controls, if supported.

Use indentation and subtle guide lines to communicate hierarchy. Avoid turning every layer into a boxed card.

Layer rows should have:

- Node-type icon.
- Layer name.
- Selection state.
- Optional visibility or lock control.
- Context menu.

The selected row should be clear but not visually loud.

#### Center canvas

Contains:

- Neutral canvas background.
- Design artboard or viewport.
- Zoom and pan controls.
- Selection outline.
- Resize handles.
- Alignment guides, when implemented.
- Empty canvas guidance.

The canvas background must remain visually subordinate to the design being edited.

The rendered design should not inherit Layora's workspace typography, colors, or button styles. It must display the design document's own values.

#### Right panel

Use contextual tabs or a clear mode switch:

- **Properties:** controls for the selected node.
- **AI Chat:** conversation and revision requests.

Avoid displaying every property category at once. Use grouped sections with clear labels and sensible defaults.

### 6.2 Canvas toolbar

Keep the toolbar compact:

- Select tool.
- Hand/pan tool.
- Zoom out.
- Zoom percentage.
- Zoom in.
- Fit to screen.
- Viewport preset.

Only implement tools that work. Do not show inert controls.

### 6.3 Selection behavior

- Selecting an element on the canvas selects the corresponding layer.
- Selecting a layer highlights the corresponding canvas element.
- Selecting a child should not accidentally select its parent.
- Escape should move selection to the parent or clear selection, according to the implemented interaction model.
- Selection outlines must not be included in exported design output.

### 6.4 Properties panel

Group controls by purpose:

1. Position and size.
2. Layout.
3. Appearance.
4. Typography, for text nodes.
5. Image settings, for image nodes.
6. Effects, when supported.

Use numeric inputs for precise values. Sliders can supplement numeric inputs but should not replace them for exact design work.

---

## 7. AI Conversation Panel

The AI panel is a design assistant, not the main application screen.

### Visual treatment

- Compact message history.
- Clear distinction between user messages and agent responses.
- Visible task state.
- Prompt input anchored at the bottom.
- Selected-node context when applicable.
- Clear indication when a request affects the whole page versus a selected element.

### Prompt input

Include:

- Multiline text input.
- Attach reference action.
- Scope indicator.
- Submit action.
- Cancel action while generation is running, when supported.

Do not add decorative example prompts to every empty state. Show a small number of useful suggestions only when they help the user understand possible revisions.

### Revision review

For substantial changes, show a review state:

- What changed.
- Which nodes were affected.
- Preview of the updated design.
- Apply or discard action.

The AI must not silently replace unrelated manual edits.

---

## 8. Reference Manager

References should be displayed as useful source material, not as a generic file gallery.

### Reference item

Show:

- Thumbnail or file icon.
- Reference name.
- Reference type.
- Source or file name.
- Optional user note.
- Availability or processing status.

### Reference workspace

Support:

- Grid or list view.
- Search.
- Filter by type.
- Preview.
- Rename.
- Remove.
- Add to current generation task.

Use a clear distinction between a reference saved to a project and a reference currently attached to a generation request.

---

## 9. Agent Settings

Agent settings should communicate technical status plainly.

Each agent entry should show:

- Agent name.
- Execution mode.
- Connection status.
- Supported capabilities.
- Configuration action.
- Test connection action.

Use text labels alongside status indicators. Do not rely on color alone.

A disconnected agent should explain what the user needs to do next. An unsupported capability should be disabled or omitted, not presented as an available option.

---

## 10. Figma Export Experience

Primary action: **Copy to Figma**

The action should be visible in the workspace toolbar when a valid design is open.

### Before copying

Show a compact compatibility check when needed:

- Number of supported nodes.
- Number of unsupported nodes.
- Properties that may be approximated.
- Text and image handling.
- Layout preservation status.

Do not interrupt the user with a large dialog when the document is fully compatible with the tested exporter.

### After copying

Show clear feedback:

- Copy completed.
- Instructions to paste into Figma.
- Any known limitations.
- Retry action if clipboard writing fails.

Do not say "Copied as editable Figma layers" unless that exact result has been verified for the current export path and document.

### Fallback

If native-style clipboard output is unavailable, offer an explicitly labelled fallback such as SVG or PNG. Explain the editability trade-off before the user chooses it.

---

## 11. Responsive Behavior

Layora is primarily a desktop workspace. The initial product should optimize for laptop and desktop use.

### Desktop

- Full workspace with left, center, and right regions.
- Resizable side panels.
- Keyboard shortcuts.
- Full layer and property editing.

### Tablet

- Collapsible side panels.
- Canvas remains primary.
- Properties and AI chat use drawers or tabs.

### Mobile

Mobile should initially support project browsing, preview, and basic task monitoring. Do not attempt to compress the full professional editing workspace into a narrow screen in the first release.

---

## 12. Interaction and Feedback

Use consistent interaction patterns:

- Hover: subtle surface change.
- Focus: visible keyboard focus ring.
- Selected: clear selection background or outline.
- Disabled: reduced emphasis and unavailable interaction.
- Loading: local progress indicator with a meaningful status.
- Error: explain what failed and what can be done.
- Success: concise confirmation.

Dialogs should be reserved for destructive actions, important configuration, and decisions that cannot be made inline.

Use toasts for short-lived confirmations, not for information the user needs to act on.

---

## 13. Accessibility

- Maintain sufficient text and control contrast.
- Provide keyboard access to primary workspace controls.
- Use visible focus states.
- Label icon-only buttons.
- Do not communicate status through color alone.
- Ensure form controls have labels and useful error messages.
- Respect reduced-motion preferences.
- Keep selection and layer hierarchy understandable without relying only on color.

---

## 14. Design System Tokens

Create tokens in code rather than repeating arbitrary values across components.

Suggested token groups:

```text
color/
  app-bg
  panel-bg
  panel-muted
  canvas-bg
  border
  text-primary
  text-secondary
  text-muted
  accent
  success
  warning
  danger

spacing/
  1
  2
  3
  4
  5
  6
  8

radius/
  control
  menu
  panel
  dialog

typography/
  family
  size/
  weight/
  line-height/

shadow/
  floating
  dialog

z-index/
  base
  sticky
  dropdown
  popover
  modal
  toast
```

The exact token implementation can follow the chosen styling stack, but token names and semantics should remain stable.

---

## 15. Component Design Guidelines

Build reusable components for:

- App navigation.
- Panel header.
- Project item.
- Page row.
- Layer row.
- Property section.
- Numeric input.
- Color input.
- Segmented control.
- Tooltip.
- Context menu.
- Dialog.
- Toast.
- Empty state.
- Agent status.
- Reference item.
- Generation progress.
- Canvas selection overlay.

Components should have a small, intentional set of variants. Avoid creating many nearly identical variants for minor visual differences.

---

## 16. Design Quality Checklist

Before considering a screen complete, check:

### Hierarchy
- [ ] The primary action is immediately identifiable.
- [ ] Page and panel titles are consistent.
- [ ] Supporting information is visually secondary.
- [ ] The canvas has sufficient space.

### Consistency
- [ ] Spacing follows the token scale.
- [ ] Inputs and buttons have consistent heights.
- [ ] Icons use a consistent visual style.
- [ ] Borders and radii are used consistently.

### Usability
- [ ] Every visible control has a real action.
- [ ] Selection states are clear.
- [ ] Empty, loading, error, and success states exist.
- [ ] Important actions provide feedback.
- [ ] Keyboard focus is visible.

### Visual restraint
- [ ] No unnecessary gradients or glow effects.
- [ ] No decorative statistics.
- [ ] No excessive cards or badges.
- [ ] No oversized empty areas.
- [ ] The interface does not compete with the generated design.

### Export
- [ ] Copy action is easy to find.
- [ ] Compatibility warnings are understandable.
- [ ] Fallback formats are labelled honestly.
- [ ] Export feedback matches the actual result.

---

## 17. Design Acceptance Criteria

The design direction is successful when a programmer can:

1. Create a project without navigating through unnecessary screens.
2. Understand the difference between Local AI, API AI, and External AI Agent.
3. Select Create from Scratch or Source Code to Design without confusion.
4. Add and manage references.
5. Generate a design and understand its current status.
6. Inspect and edit the design through the layer tree and properties panel.
7. Request AI revisions without losing control of manual edits.
8. Find the Copy to Figma action and understand its compatibility.
9. Work for extended periods without decorative UI elements distracting from the canvas.

The final interface should feel like a practical design tool: quiet, precise, responsive, and predictable.
