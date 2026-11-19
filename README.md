# AskBOT — Multi-Provider AI Desktop Chat

> A refined, client-side, zero-build Multi-Provider AI chat application inspired by Google Gemini's craft and Groq Playground's parameter controls. Built using pure **HTML5, CSS3, and Vanilla JavaScript (ES Modules)**.

![AskBOT](https://img.shields.io/badge/Architecture-Vanilla%20ES%20Modules-blue?style=flat-square)
![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side%20BYOK-emerald?style=flat-square)
![Build](https://img.shields.io/badge/Build%20Step-Zero%20(Pure%20Static)-purple?style=flat-square)

---

## Highlights & Features

1. **True Bring Your Own Key (BYOK) Privacy**
   - Direct browser connection to providers.
   - Keys are stored **strictly in browser `localStorage`** and never touch any intermediate server or database.

2. **5 Frontier AI Providers & Dynamic Model Discovery**
   - **Groq**: Ultra-fast Llama 3.3 70B, DeepSeek R1 Distill, Mixtral.
   - **Google Gemini**: Gemini 2.0 Flash, 1.5 Pro, native Google Search grounding, and thinkingConfig.
   - **OpenAI**: GPT-4o, GPT-4o Mini, o1, and o3-mini reasoning models.
   - **Anthropic Claude**: Claude 3.7 Sonnet (Hybrid Reasoning), 3.5 Sonnet, 3.5 Haiku via direct browser access (`anthropic-dangerous-direct-browser-access: true`).
   - **xAI**: Grok 2, Grok 2 Vision, and Grok Beta.
   - Automatically queries each provider's `/models` endpoint on key entry to populate only compatible chat models.

3. **Groq Playground-Style Parameter Drawer**
   - **Temperature**: `0.0` to `2.0` (auto-clamped to `1.0` for Claude).
   - **Max Completion Tokens**: Dynamically clamped slider.
   - **Context Window Tokens**: Sliding context budget that trims older conversation turns while preserving system instructions and the latest user turn. Live token estimation readout.

4. **Interactive Composer Modes**
   - **Code Interpreter**: Runs Python client-side using **Pyodide (WebAssembly via CDN)** in a dedicated Web Worker. Captures `stdout`, `stderr`, and exports rendered `matplotlib.pyplot` charts to base64 PNGs directly inside chat execution cards.
   - **Web Search**: 
     - Native `googleSearch` grounding for Gemini.
     - Dual DuckDuckGo Instant Answer API + Wikipedia REST search for other providers (with optional Tavily API key support in Settings).
   - **Thinking Mode**:
     - Toggle between `Off`, `Low`, `Medium`, and `High`.
     - Maps to native provider reasoning parameters (`thinkingBudget`, `budget_tokens`, `reasoning_effort`) and parses `<think>...</think>` tags into an animated, collapsible **"Thought process"** accordion with word count.

5. **Craft & Gemini-Inspired Aesthetic**
   - Obsidian/Slate dark theme (`#131314`) and snow light theme (`#FFFFFF`).
   - Authentic sidebar history: strictly empty until you start a real chat (zero placeholder or mock conversations). Auto-generates concise conversation titles from your first prompt.
   - Micro-interactions: Top-left `made by ayujha-dev` linking to [https://github.com/ayujha-dev](https://github.com/ayujha-dev) with a subtle shimmer and tracking hover animation.
   - Multimodal attachments: Supports images (base64 vision for multimodal models) and text/code files (Markdown, Python, JS, TS, JSON, CSV).

---

## Quickstart (Zero Build Step)

Since AskBOT requires no compilation or npm dependencies, run it with any static local web server:

### Option A: Python HTTP Server (Built-in)
```bash
python3 -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

### Option B: Node `npx serve`
```bash
npx serve .
```

### Option C: VS Code Live Server
Right-click `index.html` in VS Code and choose **"Open with Live Server"**.

---

## Local Verification Checklist

When opening AskBOT locally:
- [x] **First Launch**: Shows onboarding modal if no keys exist in `localStorage`.
- [x] **Provider Validation**: Enter your API key and click "Validate & Save" to discover live models.
- [x] **New Chat & Authentic History**: The sidebar remains empty until a real message is sent; auto-generates a clean title.
- [x] **Code Interpreter**: Enable Python mode in the composer and ask `Plot a sine wave in matplotlib`. The Pyodide worker executes it client-side and displays the plot.
- [x] **Web Search Grounding**: Enable Web Search mode and ask `What are the latest Artemis mission updates?`. Sources and citations appear above the answer.
- [x] **Thinking Accordion**: Enable Thinking mode (`Low` or `Medium`) and send a math or logic riddle to see the animated collapsible thought process.
- [x] **Parameter Sliders**: Open the right drawer and adjust Temperature, Max Tokens, or Context Window tokens.

---

## Architecture

```
AskBOT/
├── index.html                   # Semantic HTML5 layout shell
├── css/
│   ├── main.css                 # Gemini design tokens & animations
│   └── highlight-theme.css      # Code syntax highlighting
├── js/
│   ├── app.js                   # Main application coordinator
│   ├── state/
│   │   ├── store.js             # Reactive observable store & localStorage
│   │   └── default-state.js     # Default config & schemas
│   ├── providers/
│   │   ├── base-provider.js     # Base SSE streaming & interface
│   │   ├── groq-provider.js     # Groq adapter (Llama, DeepSeek)
│   │   ├── gemini-provider.js   # Gemini adapter (Search grounding, thinkingConfig)
│   │   ├── openai-provider.js   # OpenAI adapter (GPT-4o, o1, o3)
│   │   ├── claude-provider.js   # Anthropic Claude adapter (CORS headers)
│   │   ├── xai-provider.js      # xAI Grok adapter
│   │   └── provider-registry.js # Registry & fallback presets
│   ├── services/
│   │   ├── token-counter.js     # Token estimation & context sliding trimmer
│   │   ├── search-service.js    # DuckDuckGo + Wikipedia + Tavily client search
│   │   └── pyodide-bridge.js    # RPC bridge to Pyodide WebAssembly worker
│   ├── workers/
│   │   └── pyodide.worker.js    # Web Worker running Pyodide WASM
│   └── ui/components/
│       ├── sidebar.js           # Authentic chat history & theme
│       ├── composer.js          # Bottom pill bar & mode toggles
│       ├── messages.js          # Message feed, thinking accordion & execution cards
│       ├── suggestions.js       # Dynamic greetings & 4 randomized prompt chips
│       ├── parameters-drawer.js # Groq playground sliders
│       ├── file-manager.js      # File uploads & previews
│       ├── onboarding-modal.js  # First-launch BYOK modal
│       └── settings-modal.js    # API keys & privacy controls
└── assets/icons/icons.svg       # Clean SVG symbol sprites
```

---

## License

MIT © [ayujha-dev](https://github.com/ayujha-dev)
