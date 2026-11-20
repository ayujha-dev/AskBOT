# AskBOT — Multi-Provider AI Desktop Chat

> A refined, high-craft, client-side Multi-Provider AI chat application featuring a soft matte tactile aesthetic, Brave Search API grounding, Pyodide Python code execution, and Groq Playground parameter controls. Built with pure **HTML5, CSS3, and Vanilla JavaScript (ES Modules)** — **Zero build step required**.

[![Zero Build](https://img.shields.io/badge/Build-Zero%20Build%20(Pure%20ESM)-purple?style=flat-square)](#quickstart-zero-build)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side%20BYOK-emerald?style=flat-square)](#byok-privacy-guarantee)
[![Tests](https://img.shields.io/badge/Tests-45%20Passed%20(Node%20Native)-brightgreen?style=flat-square)](#testing--verification)
[![Live Demo on Vercel](https://img.shields.io/badge/Live%20Demo-askbot--rust.vercel.app-black?style=flat-square&logo=vercel)](https://askbot-rust.vercel.app)

---

## 🌟 Highlights & Features

### 1. Tactile Soft Matte Design System
Refactored with high-craft design principles: zero harsh pure blacks (`#000000`), zero glaring pure whites (`#FFFFFF`), and no loud neon gradients.
- **Matte Dark (Default)**:
  - App background: `#16171A`
  - Sidebar & elevated surfaces: `#1D1F23`
  - Chat composer & cards: `#23262B`
  - Hairline borders: `rgba(255, 255, 255, 0.07)`
  - Primary text: `#E4E5E7` | Muted text: `#969BA4`
  - Muted dusty slate-blue accent: `#7C98B6` (hover: `#8FA9C5`)
- **Matte Light**:
  - App background: `#F4F3EF`
  - Sidebar & elevated surfaces: `#ECEAE4`
  - Chat composer & cards: `#FAF9F6`
  - Hairline borders: `rgba(0, 0, 0, 0.08)`
  - Primary text: `#222428` | Muted text: `#666A73`
  - Accent: `#4A6680`
- **760px Centered Conversation Runway**: Constrained to `760px` max-width with generous whitespace and clear typography.

### 2. Brave Search API Integration & Zero-Dependency CORS Proxy
- **Brave LLM Context Grounding**: Connects to Brave's `GET /res/v1/llm/context` endpoint with token budgets up to 6,000 tokens for real-time news, verified facts, and recent event grounding. Brave offers **$5.00/month in free developer credits** at [api-dashboard.search.brave.com](https://api-dashboard.search.brave.com).
- **Exact Date Injection & Citation**: Injects current local date and prompts the model to prioritize `<web_search_results>` over training data cut-offs, citing references as `[1]`, `[2]`.
- **Clickable Matte Source Chips**: Renders matte source chips (domain badge + title + age/date) below assistant responses. Shows a subtle `Searching Brave...` status pill during fetch.
- **CORS-Safe Local Proxy (`proxy.mjs`)**: Tiny zero-dependency Node.js server that serves the static app at `http://localhost:8787/` AND forwards `/brave-search` requests to Brave with your `X-Subscription-Token` header, bypassing browser CORS issues.
- **Graceful Fallbacks**: Automatically falls back to DuckDuckGo Instant Answers & Wikipedia if no Brave key is configured.

### 3. In-Composer Model Selector & Clean Top Bar
- **Ultra-Clean Header**: Top bar is free of clutter, housing only the sidebar toggle, subtle animated `made by ayujha-dev` GitHub link, current chat title breadcrumb, quick new chat, context token counter, and parameters drawer toggle.
- **In-Composer Model Selector**: Model selector lives inside the chat composer input (`#composer-model-pill`). Refined popover features:
  - Real-time search filter input to quickly search across all provider models.
  - Provider tabs highlighting active configured API keys with emerald indicators.
  - Subtle capability badges (`Vision`, `Reasoning`) for models supporting image/video input or reasoning loops.

### 4. Thinking Mode with Minimum Set to `Low`
- Reasoning depth selector inside the chat composer features **3 levels only: `Low` | `Medium` | `High`**, with **`Low` as the minimum and default** (no `Off` state).
- Seamlessly maps to provider-native reasoning parameters:
  - `reasoning_effort` for OpenAI (`o1`, `o3-mini`).
  - `thinkingBudget` (1024, 4096, 8192 tokens) for Google Gemini (`2.0 Flash`, `2.5`).
  - Token budget for Anthropic Claude (`3.7 Sonnet`).
  - Omitted gracefully for non-reasoning models without throwing API errors.

### 5. Whisper-Quiet Tracking Rail
- **Ultra-Slim Profile**: Vertical rail along the right edge (`hidden xl:flex`) providing high-utility signals without noisy labels.
- **Conversation Minimap Ticks**: Hairline ticks representing each turn. Hovering reveals a prompt excerpt tooltip with output badges; clicking smoothly scrolls straight to that message.
- **Context Window Meter**: Thin vertical fill bar displaying real-time estimated tokens against your context budget (turns warm amber when above 80% capacity; clicking opens the Parameters drawer).
- **Session Micro-Indicators**: Micro status dots showing live states (Search ON, Code Interpreter ON, Thinking level).

### 6. Message Actions & Multimodal Support
- **Hover Action Bars**:
  - **Assistant messages**: One-click **Copy** (copies markdown) and **Regenerate** (re-runs response).
  - **User messages**: One-click **Copy** (copies prompt) and **Edit & Resend** (populates composer for instant tweaking).
- **Multimodal Uploads & Clipboard Paste**: Drag-and-drop or clipboard paste screenshots directly into the composer. Native video file processing supported for Google Gemini.
- **Pyodide Python WASM Interpreter**: Client-side Python execution in a Web Worker, rendering code outputs and `matplotlib` plots in interactive cards.

---

### 7. Multi-Provider BYOK Matrix

Connect with your own keys directly from your browser:
- **Groq**: Llama 3.3 70B, DeepSeek R1 Distill, Mixtral.
- **Google Gemini**: Gemini 2.0 Flash, Gemini 1.5 Pro, and native Google Search grounding.
- **Anthropic Claude**: Claude 3.7 Sonnet (Hybrid Reasoning), Claude 3.5 Sonnet, and Haiku.
- **OpenAI**: GPT-4o, GPT-4o Mini, o1, and o3-mini reasoning models.
- **xAI**: Grok 2, Grok 2 Vision, and Grok Beta.

---

## 🚀 Quickstart (Zero Build)

AskBOT requires **no node modules, webpack, vite, or compilers**. Run it instantly on any static web server:

### Option 1: Zero-Dependency Local Proxy Server (Recommended for Brave Search)
```bash
node proxy.mjs
```
Open [http://localhost:8787](http://localhost:8787) in your browser. This serves the full app and enables CORS-free Brave Search at `/brave-search`.

### Option 2: Python Built-in Server
```bash
python3 -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 3: Node `npx serve`
```bash
npx serve .
```

---

## 🌐 Deployment & Live Demo

AskBOT is live on Vercel at **[https://askbot-rust.vercel.app](https://askbot-rust.vercel.app)**.

Continuous deployments are configured via GitHub integration with `ayujha-dev/AskBOT`. Every push to `main` deploys automatically with zero build configuration.

---

## 📁 Repository Structure

```
AskBOT/
├── index.html                   # Core semantic layout shell & modals
├── proxy.mjs                    # Zero-dependency local server & Brave CORS proxy
├── vercel.json                  # Edge routing & security headers
├── css/
│   ├── main.css                 # Soft matte design system & tokens (760px runway)
│   └── highlight-theme.css      # Code block syntax theme
├── js/
│   ├── app.js                   # Application coordinator & state wiring
│   ├── state/
│   │   ├── store.js             # Reactive observable store with localStorage
│   │   └── default-state.js     # Default state schema & configuration
│   ├── providers/
│   │   ├── base-provider.js     # Base SSE streaming & interface contracts
│   │   ├── groq-provider.js     # Groq adapter (Llama, DeepSeek)
│   │   ├── gemini-provider.js   # Gemini adapter (Search grounding, thinkingConfig)
│   │   ├── openai-provider.js   # OpenAI adapter (GPT-4o, o1, o3-mini)
│   │   ├── claude-provider.js   # Claude adapter (Direct browser access headers)
│   │   ├── xai-provider.js      # xAI Grok adapter
│   │   └── provider-registry.js # Registry, model auto-detection & fallback presets
│   ├── services/
│   │   ├── pyodide-bridge.js    # RPC bridge to Pyodide WebAssembly worker
│   │   ├── search-service.js    # Brave Search API + DDG + Wikipedia grounding
│   │   └── token-counter.js     # Token estimation & context sliding trimmer
│   ├── workers/
│   │   └── pyodide.worker.js    # Dedicated Web Worker running Pyodide WASM
│   ├── utils/
│   │   ├── dom.js               # HTML escaping & URL sanitization (XSS defense)
│   │   ├── file-reader.js       # File attachment parser (images, video, text)
│   │   ├── markdown.js          # Marked.js + Highlight.js renderer
│   │   └── stream-buffer.js     # Tag stream buffer for multi-chunk reasoning tags
│   └── ui/components/
│       ├── background-effects.js# Calm ambient canvas with soft twilight orbs
│       ├── chat-nav-rail.js     # Minimalist tracking rail (ticks, token gauge, modes)
│       ├── composer.js          # Bottom composer with fast model picker & thinking
│       ├── file-manager.js      # Multimodal attachments preview manager
│       ├── messages.js          # Message rendering, action buttons & matte chips
│       ├── onboarding-modal.js  # First-launch BYOK onboarding flow
│       ├── parameters-drawer.js # Groq playground sliders, presets & backdrop
│       ├── settings-modal.js    # 3-tab intuitive settings & Brave configuration
│       ├── sidebar.js           # Authentic history, title generator & theme
│       └── suggestions.js       # Time-of-day greetings & prompt action chips
├── assets/
│   └── icons/
│       └── icons.svg            # Clean SVG symbol sprites
└── tests/                       # 45 unit tests (Node.js test runner)
    ├── enhancements.test.js
    ├── files.test.js
    ├── interactive_modes.test.js
    ├── model-switch-and-typography.test.js
    ├── nav-rail-and-settings.test.js
    ├── parameters.test.js
    ├── paste_and_video.test.js
    ├── providers.test.js
    ├── review_fixes.test.js
    ├── sidebar_settings.test.js
    ├── soft-matte-brave-and-rail.test.js
    ├── store.test.js
    ├── task1.test.js
    └── ui_canvas.test.js
```

---

## 🔒 BYOK Privacy Guarantee

AskBOT was designed with user sovereignty and privacy as first principles:
- **No Analytics / Telemetry**: Zero tracking scripts.
- **No Intermediary Logging**: All calls dispatch directly from the browser (or through your own local `proxy.mjs`).
- **Encrypted in Browser**: Keys are stored exclusively in your browser's local sandbox storage.

---

## 🧪 Testing & Verification

AskBOT includes an end-to-end unit test suite run via Node.js's native test runner (zero external testing dependencies):

```bash
node --test tests/*.test.js
```

**Test Coverage Highlights:**
- **45/45 Tests Passing** across all modules:
  - Soft Matte color tokens (no harsh `#000` or `#FFF`), 760px container width.
  - Brave Search API source parsing, `<web_search_results>` formatting, connection detection.
  - `proxy.mjs` zero-dependency local proxy server route verification.
  - Clean top bar (no model badge) & composer model pill preservation.
  - Thinking mode minimum set to `Low` (3 levels: Low, Medium, High).
  - Minimalist tracking rail: minimap hairline ticks, live context gauge, mode indicators.
  - BaseProvider SSE chunk boundary buffering & tag extraction.
  - TokenCounter sliding window budget trimming and user turn preservation.
  - Pyodide WebAssembly code block extraction and worker timeout guards.
  - Stored XSS defense validation via `dom.js`.
  - Output Navigation Rail turn counting and output target categorization.
  - Fast Model Switcher in composer toolbar, sidebar card, and search filtering.
  - Clipboard image/video pasting and Gemini native video multimodal processing.

---

## 👤 Author

Crafted with care by **[ayujha-dev](https://github.com/ayujha-dev)**.
