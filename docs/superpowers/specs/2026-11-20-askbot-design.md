# AskBOT Design Specification

**Date:** 2026-11-20  
**Project:** AskBOT  
**Author:** ayujha-dev & Antigravity  
**Status:** Approved  

---

## 1. Intent & The "Why"
AskBOT is an uncompromising, client-side, multi-provider AI desktop & mobile chat experience. Unlike bloated electron apps or server-bound chatbots that compromise user privacy and impose recurring costs, AskBOT gives power users direct, browser-native access to the five primary frontier LLM providers (Groq, xAI, OpenAI, Google Gemini, Anthropic Claude) via a Bring Your Own Key (BYOK) paradigm.

It delivers a Google Gemini-grade user experience—spacious, refined, and devoid of generic "AI slop" gradients or unnecessary visual clutter—with features like client-side Python execution (via Pyodide WebAssembly in a Web Worker), live real-time internet search grounding, and collapsible thinking token visualization.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Client-Side & Zero-Build:** Pure HTML, CSS, and Vanilla JavaScript (ES Modules) that can run on any static web server (`python3 -m http.server`, VS Code Live Server, or GitHub Pages) without Node/bundler build steps.
- **True Multi-Provider BYOK:** Support Groq, xAI, OpenAI, Google Gemini, and Anthropic Claude with keys stored strictly in `localStorage`.
- **Live Model Auto-Detection:** Dynamically discover models available to each configured API key via provider `/models` endpoints and filter out non-chat models.
- **Interactive Modes:**
  1. *Code Interpreter Mode:* Client-side execution of generated Python code via Pyodide WebAssembly in a Web Worker with captured stdout/stderr and matplotlib plots.
  2. *Web Search Mode:* Native Gemini search grounding; client-side DuckDuckGo + Wikipedia query extraction & context injection for other providers (with optional Tavily API key).
  3. *Thinking Mode Selector:* Native parameter mapping (`thinkingConfig`, `budget_tokens`, `reasoning_effort`) and streaming parser for collapsible `<think>` accordions.
- **Sliding Context Budget:** Groq playground-style parameter drawer with real-time sliding context token trimmer to ensure requests never exceed target token budgets.
- **Authentic History:** Zero placeholder or mock chats. Empty state until the user sends an actual prompt.
- **Subtle Branding & Taste:** Clean Google Gemini visual language, restrained micro-interactions, dark/light theme support, and a top-left `made by ayujha-dev` link to `https://github.com/ayujha-dev`.

### Non-Goals
- Backend proxy or server-side session persistence (all keys and chats stay in the browser).
- Multi-user authentication or login systems.
- Heavy frameworks (React, Vue, Svelte) that require compilation pipelines.

### Anti-Goals
- Generic "AI slop": excessive rainbow gradients, neon glows, slow bouncy 500ms animations, or cluttered UI toolbars.
- Mocking or stubbing network requests: every provider call must interact with real, live provider APIs.

---

## 3. Constraints
- **CORS Requirements:** Direct browser access to Anthropic requires `anthropic-dangerous-direct-browser-access: true` and `anthropic-version: 2023-06-01`.
- **Single Page App without Bundlers:** Modern native ES Modules (`import`/`export`) supported across all modern browsers.
- **External Dependencies:** Only high-reputation CDNs (Tailwind CSS CDN for utility baseline, Marked.js for markdown rendering, Highlight.js for code syntax highlighting, Pyodide CDN for WebAssembly runtime).

---

## 4. Approaches Considered

| Approach | Description | Tradeoffs | Verdict |
| :--- | :--- | :--- | :--- |
| **A: Full React/Next.js SPA with Server Proxy** | Standard full-stack web app with backend API routes. | Requires Node.js runtime, build steps, server deployment, and compromises client-side BYOK privacy. | **Rejected** (Violates zero-build, static local server constraint). |
| **B: Single Monolithic `index.html` File** | Putting all HTML, CSS, and 2,000+ lines of JS in a single file. | Quick to prototype, but impossible to maintain, test, or modularize provider adapters. | **Rejected** (Violates clean architecture & separation of concerns). |
| **C: Modular ES Modules Architecture** *(Chosen)* | Pure Vanilla JS with native ES Modules, isolated provider adapters, reactive state store, and Pyodide Web Worker. | Clean separation of concerns, zero build step required, runs instantly on any static server, and highly maintainable. | **Selected** |

---

## 5. Subsystem Architecture

### 5.1 Architecture Overview
```
+-----------------------------------------------------------------------------------+
|                                  index.html                                       |
+-----------------------------------------------------------------------------------+
|  [Sidebar]          |  [Conversational Canvas]               |  [Parameter Drawer]|
|  - Authentic History|  - Empty State / Greeting & Cards     |  - Temperature      |
|  - New Chat         |  - Message Stream & Markdown           |  - Max Tokens       |
|  - Model Selector   |  - Thought Process Accordion           |  - Context Budget   |
|  - Settings Modal   |  - Execution Output & Search Citations |                    |
|                     +----------------------------------------+                    |
|                     |  [Floating Composer]                   |                    |
|                     |  - File Attachments (+ / chips)        |                    |
|                     |  - Modes: Python, Search, Thinking     |                    |
+-----------------------------------------------------------------------------------+
         |                                |                               |
    [State Store]                 [Event Coordinator]             [Pyodide Worker]
    (localStorage)                     (app.js)                   (WASM Execution)
         |                                |
         +--------------------------------+
                          |
             [Provider Registry & Adapters]
             - GroqProvider
             - xAIProvider
             - OpenAIProvider
             - GeminiProvider
             - ClaudeProvider
```

### 5.2 Provider Protocol & Direct Browser Integration
Each provider implements `BaseProvider`:
- `fetchModels(apiKey)`: Queries `/models` endpoint, parses response, filters valid chat models, and returns standard `{ id, name, contextWindow, supportsVision, supportsThinking }` list.
- `streamChat({ messages, model, parameters, modes, onChunk, onThinking, onSources, signal })`: Executes SSE streaming with direct browser fetch, decoding chunks in real-time, handling token reasoning deltas and inline `<think>` tags.

### 5.3 Pyodide Web Worker Bridge
A dedicated Web Worker (`pyodide.worker.js`) asynchronously imports Pyodide via CDN, loads requested packages (e.g. `numpy`, `matplotlib`), redirects stdout/stderr to custom listeners, and extracts rendered plots via an in-memory `io.BytesIO` buffer converted to base64 PNG.

### 5.4 Search Service
- For Gemini: Native `googleSearch` tool payload.
- For other providers: Extracts search queries, queries DuckDuckGo Instant Answer API and Wikipedia REST search, aggregates snippet context with citation URLs, and injects it into prompt messages before calling the LLM.

---

## 6. Verification Plan
- Cross-provider live API key validation.
- Live model auto-detection and population in UI dropdown.
- SSE streaming response verification with token chunking.
- Code execution output and plot rendering in Pyodide.
- Search grounding citation rendering.
- Context budget trimming verification.
- Mobile responsiveness (390px to 1440px).
