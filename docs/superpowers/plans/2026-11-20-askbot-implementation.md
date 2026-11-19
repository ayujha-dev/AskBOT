# AskBOT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional, client-side, zero-build Multi-Provider AI Chatbot (Groq, xAI, OpenAI, Google Gemini, Anthropic Claude) using pure HTML, CSS, and Vanilla JavaScript (ES Modules) with Gemini-grade aesthetics, BYOK key management, live model discovery, Pyodide WebAssembly Python execution, client-side search grounding, and collapsible thinking visualization.

**Architecture:** A decoupled ES Modules architecture with a reactive state store (`store.js`), unified provider adapter registry (`BaseProvider` subclasses with live `/models` query & SSE stream parsing), Pyodide Web Worker for non-blocking Python execution, client-side search service, and responsive Gemini-inspired UI components.

**Tech Stack:** Pure HTML5, CSS3, Vanilla JavaScript (ES2022 Modules), Tailwind CSS (CDN), Marked.js (CDN), Highlight.js (CDN), Pyodide WebAssembly (CDN).

**Spec:** `docs/superpowers/specs/2026-11-20-askbot-design.md`

## Global Constraints
- Pure HTML, CSS, and Vanilla JavaScript (ES Modules) with zero build step.
- Must run cleanly on any local static server (e.g., `python3 -m http.server 8000`).
- No API keys ever leave the browser except directly to the selected provider endpoint.
- Anthropic browser requests MUST include `anthropic-dangerous-direct-browser-access: true` and `anthropic-version: 2023-06-01`.
- Sidebar chat history must remain completely authentic with ZERO mock/dummy chats.
- UI craft: Clean Google Gemini aesthetic, dark and light theme support, top-left `made by ayujha-dev` linking to GitHub with subtle micro-interactions, no generic AI-slop gradients.

## Review Focus
1. Chunk-boundary SSE streaming: An SSE chunk payload split across TCP chunks must be buffered cleanly without throwing JSON parse errors.
2. Direct Anthropic browser calls: CORS preflight must succeed with `anthropic-dangerous-direct-browser-access: true`, and temperature must be clamped to 1.0 when thinking is enabled.
3. Multi-modal vision payloads: Image attachments must format correctly into each provider's distinct schema (OpenAI `image_url`, Gemini `inlineData`, Claude `source.type="base64"`).
4. Long chat history context trimming: The sliding context token window must trim older messages while preserving system instructions and latest turns within the user-defined budget.
5. Pyodide Web Worker isolation: Infinite loops or syntax errors in Python execution must be trapped gracefully with stderr/timeout reporting and never hang the main UI thread.

---

### Task 1: Semantic HTML Shell, Gemini-Grade CSS Tokens & Layout

**Files:**
- Create: `index.html`
- Create: `css/main.css`
- Create: `css/highlight-theme.css`
- Create: `assets/icons/icons.svg`

**Interfaces:**
- Produces: Complete DOM skeleton containing Sidebar (`#sidebar`), Header (`#app-header`), Conversational Canvas (`#chat-canvas`), Floating Composer (`#chat-composer`), Parameters Drawer (`#parameters-drawer`), and Modals (`#onboarding-modal`, `#settings-modal`).
- Produces: CSS custom properties for dark (`#131314` base) and light (`#FFFFFF`/`#F0F4F9` base) themes, typography, and micro-interactions.

- [ ] **Step 1: Write `index.html`**
  - Link CDN dependencies (Tailwind CSS, Marked.js, Highlight.js).
  - Setup semantic markup for sidebar, conversational container, floating composer, parameters drawer, and modals.
  - Include top-left branding container: `<a href="https://github.com/ayujha-dev" target="_blank" class="brand-link">made by ayujha-dev</a>`.
  - Include ES Module entry point: `<script type="module" src="js/app.js"></script>`.

- [ ] **Step 2: Write `css/main.css`**
  - Define CSS custom variables: `--surface-bg`, `--surface-panel`, `--surface-border`, `--text-primary`, `--text-secondary`, `--accent-blue`, etc.
  - Style custom scrollbars, message fade-in animations, modal transitions, and drawer transitions.
  - Implement top-left branding subtle shimmer and letter-tracking hover effect.

- [ ] **Step 3: Write `css/highlight-theme.css`**
  - Implement a clean syntax highlighting theme for dark and light modes matching Google Gemini's code blocks.

- [ ] **Step 4: Write `assets/icons/icons.svg`**
  - Define reusable SVG symbol elements for providers, paperclip, send, python, search, thinking, gear, trash, copy, check, and chevron icons.

- [ ] **Step 5: Verify layout in browser**
  - Run: `python3 -m http.server 8000` and inspect DOM layout, font rendering, and responsive structure.
  - Commit: `git add . && git commit -m "feat: setup semantic HTML shell, Gemini CSS tokens and icon assets"`

---

### Task 2: Reactive State Store & LocalStorage Persistence

**Files:**
- Create: `js/state/default-state.js`
- Create: `js/state/store.js`
- Test: `tests/store.test.js` (executable in node or browser console)

**Interfaces:**
- Produces: `Store` singleton with `.getState()`, `.setState(partial)`, `.subscribe(listener)`, `.addChat()`, `.updateChat(id, updates)`, `.deleteChat(id)`, `.setActiveChat(id)`, `.addMessage(chatId, message)`, `.setApiKey(provider, key)`.
- Consumes: LocalStorage API.

- [ ] **Step 1: Implement `js/state/default-state.js`**
  - Define `defaultState` object containing initial providers, default model capabilities, parameters (temperature 0.7, maxTokens 4096, contextBudget 8192), modes (codeInterpreter false, webSearch false, thinkingLevel 'off'), empty `chats: []`, `currentChatId: null`, and theme detection (`dark` if `prefers-color-scheme: dark`).

- [ ] **Step 2: Implement `js/state/store.js`**
  - Create reactive state store class that loads persisted keys and chats from `localStorage`.
  - Support event emission on state mutation (`store.subscribe((state, changedKeys) => ...)`).
  - Enforce zero mock chats: if no stored chats exist, `state.chats` remains empty `[]`.

- [ ] **Step 3: Verify state store**
  - Verify key updates, chat creation, message appending, and localStorage serialization.
  - Commit: `git add js/state && git commit -m "feat: implement reactive state store and localStorage persistence"`

---

### Task 3: Provider Architecture & Individual Provider Adapters

**Files:**
- Create: `js/providers/base-provider.js`
- Create: `js/providers/openai-provider.js`
- Create: `js/providers/groq-provider.js`
- Create: `js/providers/xai-provider.js`
- Create: `js/providers/gemini-provider.js`
- Create: `js/providers/claude-provider.js`
- Create: `js/providers/provider-registry.js`

**Interfaces:**
- Produces: `ProviderRegistry.getProvider(id)`, `provider.fetchModels(apiKey)`, `provider.streamChat({ messages, model, parameters, modes, onChunk, onThinking, onSources, signal })`.
- Handles: SSE chunk buffering, token extraction, Claude browser access headers, Gemini grounding/thinkingConfig, and reasoning deltas.

- [ ] **Step 1: Implement `js/providers/base-provider.js`**
  - Define base class with standard SSE stream reader helper that buffers incoming bytes across chunk boundaries (`\n\n` split) and handles connection aborts.

- [ ] **Step 2: Implement `js/providers/openai-provider.js` & `js/providers/xai-provider.js`**
  - Query `GET /v1/models`, filter non-chat models.
  - Implement streaming POST `/v1/chat/completions` supporting reasoning effort for o1/o3 and multimodal vision payloads.

- [ ] **Step 3: Implement `js/providers/groq-provider.js`**
  - Query `GET https://api.groq.com/openai/v1/models`, filter chat models.
  - Implement streaming chat handling `delta.reasoning_content` (DeepSeek-R1) and `<think>` tags.

- [ ] **Step 4: Implement `js/providers/gemini-provider.js`**
  - Query `GET /v1beta/models?key={KEY}`, filter models with `supportedGenerationMethods.includes('generateContent')`.
  - Implement streaming POST `:streamGenerateContent?alt=sse&key={KEY}` with optional `tools: [{ googleSearch: {} }]` for web search and `thinkingConfig` for thinking models. Extract `groundingMetadata` for citations.

- [ ] **Step 5: Implement `js/providers/claude-provider.js`**
  - Query `GET https://api.anthropic.com/v1/models` with headers `anthropic-dangerous-direct-browser-access: true`, `anthropic-version: 2023-06-01`, and `x-api-key`.
  - Implement streaming POST `https://api.anthropic.com/v1/messages` with `thinking: { type: "enabled", budget_tokens: ... }` when thinking is enabled and automatic temperature clamping to 1.0.

- [ ] **Step 6: Implement `js/providers/provider-registry.js`**
  - Unified manager mapping provider IDs (`groq`, `xai`, `openai`, `gemini`, `claude`) to their adapter instances, caching discovered models in store.

- [ ] **Step 7: Verify provider registry**
  - Verify model filtering logic and SSE parser with synthetic event streams.
  - Commit: `git add js/providers && git commit -m "feat: implement multi-provider adapters with live model detection and streaming"`

---

### Task 4: Context Trimmer & Groq Playground Parameter Drawer

**Files:**
- Create: `js/services/token-counter.js`
- Create: `js/ui/components/parameters-drawer.js`

**Interfaces:**
- Produces: `TokenCounter.estimateTokens(textOrMessages)` and `TokenCounter.trimToContextBudget(messages, budgetTokens)`.
- Produces: `ParametersDrawer` component managing Temperature, Max Completion Tokens, and Context Window Budget with live numeric readouts.

- [ ] **Step 1: Implement `js/services/token-counter.js`**
  - Provide accurate character-to-token heuristics (~4 characters per token + per-message framing overhead).
  - Implement `trimToContextBudget`: Always preserves system instruction and trims oldest user/assistant pairs until the payload fits within `contextBudgetTokens`.

- [ ] **Step 2: Implement `js/ui/components/parameters-drawer.js`**
  - Render drawer with three sliders:
    1. Temperature (`0.0` - `2.0`, auto-capped at `1.0` if active provider is Claude).
    2. Max Completion Tokens (dynamically clamped to selected model's context limits).
    3. Context Window Tokens (slider controlling sliding context budget with live indicator).
  - Bind slider inputs to reactive store.

- [ ] **Step 3: Verify parameter controls**
  - Test temperature clamping when switching to Claude.
  - Test sliding context trimmer with mock 20-message conversation.
  - Commit: `git add js/services/token-counter.js js/ui/components/parameters-drawer.js && git commit -m "feat: implement context window trimmer and playground parameters drawer"`

---

### Task 5: File Attachments & Multimodal Ingestion

**Files:**
- Create: `js/ui/components/file-manager.js`
- Create: `js/utils/file-reader.js`

**Interfaces:**
- Produces: Attachment processor converting images (PNG, JPG, WEBP, GIF) to base64 for vision models, and reading text files (code, JSON, CSV, Markdown, TXT) into structured text blocks.
- Produces: Removable file preview chips inside composer before sending.

- [ ] **Step 1: Implement `js/utils/file-reader.js`**
  - Read files with `FileReader`, detect mime type, return `{ name, type: 'image'|'text', mimeType, data }`.
  - Validate file size limits (max 20MB for images, 5MB for text).

- [ ] **Step 2: Implement `js/ui/components/file-manager.js`**
  - Render removable file preview chips inside the composer with thumbnail preview for images and file icon for text files.
  - Expose API to clear attachments or extract formatted message content for each provider.

- [ ] **Step 3: Verify file upload workflows**
  - Test image drag-and-drop / file selector and text attachment parsing.
  - Commit: `git add js/utils/file-reader.js js/ui/components/file-manager.js && git commit -m "feat: implement file uploads and multimodal vision attachments"`

---

### Task 6: Interactive Modes (Pyodide Web Worker & Client-Side Search)

**Files:**
- Create: `js/workers/pyodide.worker.js`
- Create: `js/services/pyodide-bridge.js`
- Create: `js/services/search-service.js`

**Interfaces:**
- Produces: `PyodideBridge.execute(pythonCode)` returning `{ success, stdout, stderr, plotBase64 }`.
- Produces: `SearchService.search(query, options)` returning list of `{ title, url, snippet }`.

- [ ] **Step 1: Implement `js/workers/pyodide.worker.js`**
  - Import Pyodide CDN in Web Worker (`importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js")`).
  - Capture `sys.stdout` and `sys.stderr`.
  - Monkey-patch `matplotlib.pyplot.show` to export current figure to an in-memory buffer as base64 PNG.
  - Post back structured execution result.

- [ ] **Step 2: Implement `js/services/pyodide-bridge.js`**
  - Wrap worker communication in a clean Promise-based API with timeout handling.

- [ ] **Step 3: Implement `js/services/search-service.js`**
  - Dispatches queries to DuckDuckGo Instant Answer API (`https://api.duckduckgo.com/?q=...&format=json&origin=*`) and Wikipedia REST API (`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=...&format=json&origin=*`).
  - Support optional Tavily API key if configured in Settings.
  - Format search results into context snippet for injection into chat prompts.

- [ ] **Step 4: Verify Pyodide and Search**
  - Test Python print & plot execution in worker.
  - Test Wikipedia & DuckDuckGo search queries and snippet formatting.
  - Commit: `git add js/workers js/services && git commit -m "feat: implement Pyodide WebAssembly worker and client-side search engine"`

---

### Task 7: Gemini Conversational Canvas, Message Rendering & Composer

**Files:**
- Create: `js/utils/markdown.js`
- Create: `js/ui/components/suggestions.js`
- Create: `js/ui/components/messages.js`
- Create: `js/ui/components/composer.js`

**Interfaces:**
- Produces: Conversational feed with dynamic time greeting & 4 randomized action chips for empty state.
- Produces: Streaming message renderer with Markdown, syntax highlighting, copy-code button, interactive Python execution card, search citation pills, and collapsible "Thought process" accordion.
- Produces: Floating pill composer with mode toggles (Code Interpreter, Web Search, Thinking Mode selector: Off/Low/Med/High).

- [ ] **Step 1: Implement `js/utils/markdown.js`**
  - Configure Marked.js with Highlight.js code highlighting.
  - Custom renderer for code blocks adding language pill, copy button, and interactive "Run Python" action if Python code block.

- [ ] **Step 2: Implement `js/ui/components/suggestions.js`**
  - Render greeting ("Good morning / afternoon / evening") based on current client hour.
  - Render 4 randomized prompt cards (coding, debugging, explaining, brainstorming) that populate or auto-send on click.

- [ ] **Step 3: Implement `js/ui/components/messages.js`**
  - Render user and assistant message items.
  - Real-time streaming updater with smooth auto-scroll.
  - Thinking accordion parsing `<think>...</think>` tags and provider reasoning tokens with live timer and word count.
  - Interactive Python card with Run/Re-run button, stdout/stderr display, and rendered matplotlib plots.
  - Source citation chips displaying web sources.

- [ ] **Step 4: Implement `js/ui/components/composer.js`**
  - Pill-shaped bottom composer with textarea auto-resize (`min-h`, `max-h`).
  - Send button (`Enter` to send, `Shift+Enter` for newline).
  - Mode toggle pills:
    - Code Interpreter (Python icon)
    - Web Search (Globe icon)
    - Thinking Mode dropdown/pill (`Off`, `Low`, `Medium`, `High`)
  - File attachment button and preview tray.

- [ ] **Step 5: Verify conversational UI**
  - Test markdown rendering, code block copy button, thinking accordion expansion/collapse, and mode toggles.
  - Commit: `git add js/utils/markdown.js js/ui/components/messages.js js/ui/components/suggestions.js js/ui/components/composer.js && git commit -m "feat: implement Gemini conversational canvas, message streaming and pill composer"`

---

### Task 8: Onboarding Modal, Settings Modal & Authentic Sidebar History

**Files:**
- Create: `js/ui/components/onboarding-modal.js`
- Create: `js/ui/components/settings-modal.js`
- Create: `js/ui/components/sidebar.js`

**Interfaces:**
- Produces: Onboarding modal on first launch (if no keys exist).
- Produces: Full Settings modal to view, edit, test/validate, and delete API keys for all 5 providers + Tavily search key, with clear client-side privacy disclosure.
- Produces: Authentic sidebar history: strictly empty until the user sends a message, auto-generating concise title from first prompt, supporting chat switching, title renaming, and deletion.

- [ ] **Step 1: Implement `js/ui/components/onboarding-modal.js`**
  - Checks store on startup: if `apiKeys` is empty, display modal inviting the user to pick a provider, enter a key, and validate it.
  - Once validated, saves key to store, sets active provider, auto-loads models, and closes modal.

- [ ] **Step 2: Implement `js/ui/components/settings-modal.js`**
  - Tabs or list for all 5 providers (Groq, xAI, OpenAI, Gemini, Claude) + Tavily Search.
  - Key input with show/hide password toggle, "Validate & Fetch Models" button, and "Remove Key" button.
  - Prominent privacy note: *"Your API keys are stored exclusively in your browser's localStorage and are sent directly to each provider's API. No intermediate backend or logging server is used."*

- [ ] **Step 3: Implement `js/ui/components/sidebar.js`**
  - Zero placeholder chats.
  - New Chat button (+ icon).
  - Renders authentic list of conversations ordered by `updatedAt` descending.
  - Chat actions: rename title (inline edit), delete conversation, clear all chats.
  - Active provider & model selector button.
  - Settings button (gear icon) and Theme toggle button (sun/moon icon).

- [ ] **Step 4: Verify onboarding, settings and sidebar**
  - Test first-launch onboarding trigger and key validation.
  - Test chat creation, title generation, switching, renaming, and deletion.
  - Commit: `git add js/ui/components/onboarding-modal.js js/ui/components/settings-modal.js js/ui/components/sidebar.js && git commit -m "feat: implement onboarding modal, BYOK settings and authentic sidebar history"`

---

### Task 9: Application Orchestration, Micro-Interactions & Local Verification

**Files:**
- Create: `js/app.js`
- Create: `README.md` (Quickstart, local setup, provider key setup guide)

**Interfaces:**
- Produces: Main initialization script coordinating all components, event listeners, keyboard shortcuts, and responsive interactions.

- [ ] **Step 1: Implement `js/app.js`**
  - Initialize store and sync theme with DOM (`<html class="dark">`).
  - Wire sidebar, composer, messages, parameter drawer, and modals.
  - Implement full prompt submission flow:
    1. Retrieve active chat or create new one.
    2. Read attachments and modes (Python, Search, Thinking).
    3. If Search enabled: perform search grounding (Gemini native or DDG/Wiki/Tavily context injection).
    4. Apply context window trimmer to chat history.
    5. Call provider streamChat with SSE chunk handlers (updating thinking accordion & answer stream).
    6. If Code Interpreter enabled: detect Python blocks, execute in Pyodide Web Worker, and render execution results.
    7. Update chat title from first prompt if new chat.
    8. Auto-scroll to bottom with user-scroll override.

- [ ] **Step 2: Write comprehensive `README.md`**
  - Documentation of features, architecture, zero-build instructions (`python3 -m http.server 8000`), local testing checklist, and provider API key links.

- [ ] **Step 3: End-to-end Verification**
  - Start local HTTP server and execute the complete verification checklist across all 5 providers, UI states, modes, and parameters.
  - Commit: `git add . && git commit -m "feat: finalize app coordinator, wire all subsystems and complete end-to-end integration"`
