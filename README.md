# AskBOT — Multi-Provider AI Desktop Chat

> A refined, high-craft, client-side Multi-Provider AI chat application inspired by Google Gemini's aesthetic and Groq Playground's parameter controls. Built with pure **HTML5, CSS3, and Vanilla JavaScript (ES Modules)** — **Zero build step required**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Zero Build](https://img.shields.io/badge/Build-Zero%20Build%20(Pure%20ESM)-purple?style=flat-square)](#quickstart-zero-build)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side%20BYOK-emerald?style=flat-square)](#byok-privacy-guarantee)
[![Tests](https://img.shields.io/badge/Tests-39%20Passed%20(Node%20Native)-brightgreen?style=flat-square)](#testing--verification)
[![Live Demo on Vercel](https://img.shields.io/badge/Live%20Demo-askbot--rust.vercel.app-black?style=flat-square&logo=vercel)](https://askbot-rust.vercel.app)

---

## 🌟 Highlights & Features

### 1. 100% Client-Side Bring Your Own Key (BYOK)
- All API keys remain strictly inside your browser's `localStorage`.
- Every inference and search request is sent directly from your browser to each respective provider's API. No middleman backend, proxy, or logging server is used.

### 2. Multi-Provider Support & Live Model Auto-Detection
Connect to five frontier AI providers with dynamic `/models` auto-discovery that filters and presents only active chat models compatible with your key:
- **Groq**: Ultra-fast inference for Llama 3.3 70B, DeepSeek R1 Distill, Mixtral.
- **Google Gemini**: Gemini 2.0 Flash, Gemini 1.5 Pro, and native Google Search grounding.
- **Anthropic Claude**: Claude 3.7 Sonnet (Hybrid Reasoning), Claude 3.5 Sonnet, and Haiku via direct browser access (`anthropic-dangerous-direct-browser-access: true`).
- **OpenAI**: GPT-4o, GPT-4o Mini, o1, and o3-mini reasoning models.
- **xAI**: Grok 2, Grok 2 Vision, and Grok Beta.

### 3. Interactive Bottom Composer Modes
- 🐍 **Code Interpreter (Python WASM)**: Runs Python directly in your browser using **Pyodide WebAssembly** inside a sandboxed Web Worker. Captures `stdout`, `stderr`, and exports rendered `matplotlib.pyplot` graphs as base64 images directly inside interactive execution cards.
- 🔍 **Web Search Grounding**: 
  - **Free & Keyless by default**: Connects to DuckDuckGo Instant Answer API and Wikipedia REST endpoints (`origin=*`) with live source citations.
  - **Native Gemini grounding**: Leverages `googleSearch` when using Google Gemini.
  - **Optional Tavily AI Search**: Connect your own Tavily API key for deep web research.
- 🧠 **Deep Thinking Mode**: Select between `Off`, `Low`, `Medium`, and `High` reasoning effort. Automatically maps to provider-native parameters (`thinkingConfig` on Gemini, `thinking` budget on Claude, `reasoning_effort` on OpenAI/Groq/xAI) and parses `<think>...</think>` tags into an animated, collapsible **"Thought process"** accordion with word count.

### 4. Groq Playground-Style Parameter Controls
Collapsible parameter drawer with live numeric readouts:
- **Temperature Slider**: `0.0` to `2.0` (automatically clamped to `1.0` for Claude).
- **Max Completion Tokens**: Dynamically capped based on selected model context.
- **Context Window Sliding Budget**: Trims older conversation turns to stay within context limits while preserving system instructions and the active prompt.
- **One-Click Presets**: **Precise** (T: `0.2`, Max: `2,048`), **Balanced** (T: `0.7`, Max: `4,096`), and **Creative** (T: `1.2`, Max: `8,192`).

### 5. Chat Section Output Navigation Rail
- **Turn Scrubber**: Floating rail along the right side of the chat viewport with numbered dots for each conversation turn. Hovering shows a prompt excerpt tooltip with badges indicating what outputs were produced.
- **Output Jump Filters**: One-click quick-scrolling to next Python Code execution, Web Search citations, or Deep Thinking accordions.
- **Scroll Spy**: Highlights the active turn dot in real-time as you scroll through conversations.

### 6. Cosmic Glassmorphism & Foggy Glass Runway
- **Foggy Glass Panel (`.chat-fog-panel`)**: A dedicated frosted glass runway around the chat canvas providing crisp, high-contrast text legibility in both dark and light modes.
- **Harmonious Velvet Palette**: Calmed, synchronous cool twilight orb lighting (celestial indigo, periwinkle, whisper lavender) with zero harsh or jarring color contrasts.
- **Intuitive 3-Tab Settings Modal**: Clean segmented controls for **AI Providers** (with active provider switcher and 1-click clipboard paste), **Web Grounding** (with live search test tool), and **Storage & Privacy** (with JSON conversation export and local storage stats).
- **Authentic Chat History**: Zero dummy or mock conversations. History is populated purely by authentic user chats with automatic concise title generation.

### 7. Fast Model Switching & Editorial Craft
- **Multi-Location Model Switcher**: Change models seamlessly with one click from:
  - **Composer Toolbar**: Bottom chat pill (`#composer-model-pill`) for instant switching without leaving the input field.
  - **Sidebar Footer**: Interactive provider card with quick "Switch &rarr;" drawer trigger.
  - **Top Header**: Central model badge (`#header-model-badge`).
- **Real-Time Chat Filter & Counter**: Live filter search bar in the sidebar to search past conversations instantly, with an authentic count badge.
- **Header Breadcrumbs & Token Gauge**: Live context budget tracker displaying active token estimations alongside current conversation breadcrumbs.
- **Editorial Typography & Typewriter Entrance**: Google Fonts `Newsreader` serif typography for time-of-day greetings with a smooth typewriter entrance animation and blinking caret.
- **Fluid Spring Micro-Interactions (`.ui-spring`)**: GPU-accelerated tactile feedback across all interactive buttons, cards, and drawers.

---

## 🚀 Quickstart (Zero Build)

AskBOT requires **no node modules, webpack, vite, or compilers**. Run it instantly on any static web server:

### Option 1: Python Built-in Server (Recommended)
```bash
python3 -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Node `npx serve`
```bash
npx serve .
```

### Option 3: VS Code Live Server
Right-click `index.html` in VS Code and select **"Open with Live Server"**.

---

## 🌐 Deployment & Live Demo

AskBOT is live on Vercel at **[https://askbot-rust.vercel.app](https://askbot-rust.vercel.app)**.

Continuous deployments are configured via GitHub integration with `ayujha-dev/AskBOT`. Every push to `main` deploys automatically with zero build configuration.

### Deploy on Netlify / Cloudflare Pages / GitHub Pages
- **Build command**: None (leave empty)
- **Publish directory**: `.` (root)

---

## 📁 Repository Structure

```
AskBOT/
├── index.html                   # Core semantic layout shell & modals
├── vercel.json                  # Edge routing & security headers
├── css/
│   ├── main.css                 # Cosmic glassmorphic design system & tokens
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
│   │   ├── search-service.js    # Free DuckDuckGo + Wikipedia + Tavily search
│   │   └── token-counter.js     # Token estimation & context sliding trimmer
│   ├── workers/
│   │   └── pyodide.worker.js    # Dedicated Web Worker running Pyodide WASM
│   ├── utils/
│   │   ├── dom.js               # HTML escaping & URL sanitization (XSS defense)
│   │   ├── file-reader.js       # File attachment parser (images, text, code)
│   │   ├── markdown.js          # Marked.js + Highlight.js renderer
│   │   └── stream-buffer.js     # Tag stream buffer for multi-chunk reasoning tags
│   └── ui/components/
│       ├── background-effects.js# Reactbits-inspired dynamic ambient aurora canvas
│       ├── chat-nav-rail.js     # Output navigation rail & turn scrubber
│       ├── composer.js          # Bottom pill composer, file tray & mode pills
│       ├── file-manager.js      # Multimodal attachments preview manager
│       ├── messages.js          # Message rendering, execution cards & thoughts
│       ├── onboarding-modal.js  # First-launch BYOK onboarding flow
│       ├── parameters-drawer.js # Groq playground sliders, presets & backdrop
│       ├── settings-modal.js    # 3-tab intuitive settings & storage manager
│       ├── sidebar.js           # Authentic history, title generator & theme
│       └── suggestions.js       # Time-of-day greetings & randomized prompt chips
├── assets/
│   └── icons/
│       └── icons.svg            # Clean SVG symbol sprites
└── tests/                       # 33 unit tests (Node.js test runner)
    ├── enhancements.test.js
    ├── files.test.js
    ├── interactive_modes.test.js
    ├── nav-rail-and-settings.test.js
    ├── parameters.test.js
    ├── providers.test.js
    ├── review_fixes.test.js
    ├── sidebar_settings.test.js
    ├── store.test.js
    ├── task1.test.js
    └── ui_canvas.test.js
```

---

## 🔒 BYOK Privacy Guarantee

AskBOT was designed with user sovereignty and privacy as first principles:
- **No Analytics / Telemetry**: Zero tracking scripts.
- **No Intermediary Proxies**: Calls are dispatched directly to the official APIs (`api.groq.com`, `generativelanguage.googleapis.com`, `api.anthropic.com`, `api.openai.com`, `api.x.ai`).
- **Encrypted in Browser**: Keys are stored solely in your client browser's local sandbox storage.

---

## 🧪 Testing & Verification

AskBOT includes an end-to-end unit test suite run via Node.js's native test runner (zero external testing dependencies):

```bash
node --test tests/*.test.js
```

**Test Coverage Highlights:**
- **39/39 Tests Passing** across all modules:
  - BaseProvider SSE chunk boundary buffering & tag extraction.
  - TokenCounter sliding window budget trimming and user turn preservation.
  - Pyodide WebAssembly code block extraction and worker timeout guards.
  - SearchService query formulation and live source normalization.
  - Stored XSS defense validation via `dom.js`.
  - Output Navigation Rail turn counting and output target categorization.
  - Dynamic responsive background effects and glassmorphism design tokens.
  - Fast Model Switchers in composer and sidebar, search filtering, and editorial typography.
  - Clipboard image/video pasting and Gemini native video multimodal processing.

---

## 👤 Author

Crafted with care by **[ayujha-dev](https://github.com/ayujha-dev)**.

## 📄 License

Licensed under the [MIT License](LICENSE).
