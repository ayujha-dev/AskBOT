/**
 * Gemini Atmospheric Aura — Interactive Ambient Background Engine
 * Replaces Aurora with the full GeminiAuraEngine:
 * - Full WebGL (GLSL ES 1.00) shader + automatic HTML5 2D Canvas fallback
 * - True vertically & radially diffused atmospheric halo (Gemini Cobalt, Slate Blue, Nebula Iris, Deep Horizon)
 * - Multi-depth parallax & critically damped spring pointer tracking
 * - Organic breathing low-frequency noise (no harsh lines or ribbons)
 * - Click / tap resonance ripples (up to 6 concurrent, feathered decay)
 * - Press-and-hold "Awaken" listening focus bloom
 * - Triangular-PDF micro-dithering to eliminate 8-bit gradient banding
 * - Automatic Light/Dark mode atmospheric color calibration
 * - Clean lifecycle disposal with zero leaks
 */

export const DEFAULT_AURORA_OPTIONS = {
  colors: ['#2B5B9E', '#4B6CB7', '#3A7CA5', '#5C548E'],
  lightMode: false,
  opacity: 0.85,
  speed: 1.0,
  interactive: true,
  rippleDuration: 1.4
};

export const AURORA_LIGHT_OPTIONS = {
  lightMode: true,
  opacity: 0.42,
  colors: ['#4B6CB7', '#3A7CA5', '#5C548E', '#2B5B9E']
};

export const AURORA_DARK_OPTIONS = {
  lightMode: false,
  opacity: 0.85,
  colors: ['#2B5B9E', '#4B6CB7', '#3A7CA5', '#5C548E']
};

export class GeminiAuraEngine {
  static MAX_RIPPLES = 6;

  static hexToNormRgb(hex) {
    const clean = (hex || '').replace('#', '').trim();
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16) / 255;
      const g = parseInt(clean[1] + clean[1], 16) / 255;
      const b = parseInt(clean[2] + clean[2], 16) / 255;
      return [r, g, b];
    }
    const n = parseInt(clean || '000000', 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  static PRESETS = {
    // Default: Exact Gemini dark-mode obsidian + wide diffused sapphire/cobalt/indigo halo
    geminiCobalt: {
      name: 'Gemini Cobalt',
      baseHex: '#0b0d12',
      baseOuter: GeminiAuraEngine.hexToNormRgb('#0b0d12'),
      baseInner: GeminiAuraEngine.hexToNormRgb('#0f121b'),
      lobe1: GeminiAuraEngine.hexToNormRgb('#132252'),
      lobe2: GeminiAuraEngine.hexToNormRgb('#1c3478'),
      lobe3: GeminiAuraEngine.hexToNormRgb('#284696'),
      lobe4: GeminiAuraEngine.hexToNormRgb('#23346e'),
    },
    // Softer desaturated matte steel / slate-cobalt
    matteSlateBlue: {
      name: 'Matte Slate Blue',
      baseHex: '#0b0e14',
      baseOuter: GeminiAuraEngine.hexToNormRgb('#0b0e14'),
      baseInner: GeminiAuraEngine.hexToNormRgb('#101520'),
      lobe1: GeminiAuraEngine.hexToNormRgb('#162742'),
      lobe2: GeminiAuraEngine.hexToNormRgb('#233a5e'),
      lobe3: GeminiAuraEngine.hexToNormRgb('#35517a'),
      lobe4: GeminiAuraEngine.hexToNormRgb('#273e5c'),
    },
    // Cobalt with muted deep indigo-violet undertone
    nebulaIris: {
      name: 'Nebula Iris',
      baseHex: '#0c0b14',
      baseOuter: GeminiAuraEngine.hexToNormRgb('#0c0b14'),
      baseInner: GeminiAuraEngine.hexToNormRgb('#121020'),
      lobe1: GeminiAuraEngine.hexToNormRgb('#191f54'),
      lobe2: GeminiAuraEngine.hexToNormRgb('#2a2c7a'),
      lobe3: GeminiAuraEngine.hexToNormRgb('#413994'),
      lobe4: GeminiAuraEngine.hexToNormRgb('#233d78'),
    },
    // Midnight navy with understated soft teal-blue mist
    deepHorizon: {
      name: 'Deep Horizon',
      baseHex: '#090e13',
      baseOuter: GeminiAuraEngine.hexToNormRgb('#090e13'),
      baseInner: GeminiAuraEngine.hexToNormRgb('#0d161f'),
      lobe1: GeminiAuraEngine.hexToNormRgb('#0f273c'),
      lobe2: GeminiAuraEngine.hexToNormRgb('#173d59'),
      lobe3: GeminiAuraEngine.hexToNormRgb('#225473'),
      lobe4: GeminiAuraEngine.hexToNormRgb('#1a3554'),
    },
    // Light Mode Serene Pastel Wash
    lightPastel: {
      name: 'Light Pastel',
      baseHex: '#f3f5f9',
      baseOuter: GeminiAuraEngine.hexToNormRgb('#f3f5f9'),
      baseInner: GeminiAuraEngine.hexToNormRgb('#e8edf5'),
      lobe1: GeminiAuraEngine.hexToNormRgb('#b0c8ea'),
      lobe2: GeminiAuraEngine.hexToNormRgb('#9bc0e7'),
      lobe3: GeminiAuraEngine.hexToNormRgb('#a8b8e8'),
      lobe4: GeminiAuraEngine.hexToNormRgb('#9ad3eb'),
    }
  };

  static DEFAULT_TUNING = {
    glowIntensity: 1.0,
    breathSpeed: 1.0,
    pointerPull: 1.0,
    matteGrain: 0.7,
  };

  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.isLightMode = Boolean(options.lightMode);
    this.presetKey = options.preset && GeminiAuraEngine.PRESETS[options.preset]
      ? options.preset
      : (this.isLightMode ? 'lightPastel' : 'geminiCobalt');

    const initialPal = GeminiAuraEngine.PRESETS[this.presetKey] || GeminiAuraEngine.PRESETS.geminiCobalt;

    this.colors = {
      baseOuter: [...initialPal.baseOuter],
      baseInner: [...initialPal.baseInner],
      lobe1: [...initialPal.lobe1],
      lobe2: [...initialPal.lobe2],
      lobe3: [...initialPal.lobe3],
      lobe4: [...initialPal.lobe4],
    };

    this.targetTuning = { ...GeminiAuraEngine.DEFAULT_TUNING, ...(options.tuning || {}) };
    this.tuning = { ...this.targetTuning };

    this.elapsed = 0;
    this.breathTime = 8.4;
    this.lastMs = 0;
    this.rafId = null;

    this.pointerTarget = { x: 0.5, y: 0.5 };
    this.pointer = { x: 0.5, y: 0.5 };
    this.pointerSpringVel = { x: 0, y: 0 };

    this.trail = { x: 0.5, y: 0.5 };
    this.visualVel = { x: 0, y: 0 };

    this.pointerPresenceTarget = 0.0;
    this.pointerPresence = 0.0;
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdStrength = 0.0;

    this.focusBoostTarget = 0.0;
    this.focusBoost = 0.0;
    this.typingPulse = 0.0;

    this.ripples = Array.from({ length: GeminiAuraEngine.MAX_RIPPLES }, () => ({
      x: 0.5,
      y: 0.5,
      startTime: -100.0,
      strength: 0.0,
    }));
    this.nextRippleIndex = 0;
    this.rippleBuffer = new Float32Array(GeminiAuraEngine.MAX_RIPPLES * 4);

    this.rendererMode = 'webgl';
    this.gl = null;
    this.program = null;
    this.uniforms = {};
    this.ctx2d = null;
    this.grainTile2d = null;

    this._onResize = this.resize.bind(this);
    this._animate = this._tick.bind(this);

    this.resize();
    if (!this._initWebGL()) {
      this._init2DFallback();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onResize, { passive: true });
    }
  }

  start() {
    if (this.rafId !== null) return;
    this.lastMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.rafId = requestAnimationFrame(this._animate);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._onResize);
    }
    if (this.gl && this.program) {
      try {
        const gl = this.gl;
        gl.useProgram(null);
        if (this.vbo) gl.deleteBuffer(this.vbo);
        gl.deleteProgram(this.program);
      } catch (_) {}
    }
  }

  getRendererMode() {
    return this.rendererMode;
  }

  setLightMode(isLight) {
    this.isLightMode = Boolean(isLight);
    this.setPreset(this.isLightMode ? 'lightPastel' : 'geminiCobalt');
  }

  setPreset(key) {
    if (!GeminiAuraEngine.PRESETS[key]) return;
    this.presetKey = key;
  }

  setTuning(partial) {
    Object.assign(this.targetTuning, partial);
  }

  resetTuning() {
    this.targetTuning = { ...GeminiAuraEngine.DEFAULT_TUNING };
  }

  setFocusBoost(active, level = 0.28) {
    this.focusBoostTarget = active ? level : 0.0;
  }

  nudgeTypingPulse(amount = 0.14) {
    this.typingPulse = Math.min(0.32, this.typingPulse + amount);
  }

  updatePointer(normX, normY) {
    this.pointerTarget.x = Math.min(1, Math.max(0, normX));
    this.pointerTarget.y = Math.min(1, Math.max(0, normY));
    this.pointerPresenceTarget = 1.0;
  }

  setPointerPresent(present) {
    this.pointerPresenceTarget = present ? 1.0 : 0.0;
    if (!present) this.isHolding = false;
  }

  beginHold(normX, normY, isTouch = false) {
    this.updatePointer(normX, normY);
    if (isTouch) {
      this.pointer.x += (normX - this.pointer.x) * 0.6;
      this.pointer.y += (normY - this.pointer.y) * 0.6;
      this.pointerSpringVel.x = 0;
      this.pointerSpringVel.y = 0;
    }
    this.isHolding = true;
    this.holdStartTime = this.elapsed;
    this.triggerRipple(normX, normY, 0.95);
  }

  endHold(normX, normY) {
    if (!this.isHolding) return;
    const heldSec = this.elapsed - this.holdStartTime;
    this.isHolding = false;
    if (heldSec > 0.18) {
      const rx = typeof normX === 'number' ? normX : this.pointer.x;
      const ry = typeof normY === 'number' ? normY : this.pointer.y;
      const strength = Math.min(1.35, 0.72 + heldSec * 0.48);
      this.triggerRipple(rx, ry, strength);
    }
  }

  triggerRipple(normX, normY, strength = 1.0) {
    const slot = this.ripples[this.nextRippleIndex];
    slot.x = Math.min(1, Math.max(0, normX));
    slot.y = Math.min(1, Math.max(0, normY));
    slot.startTime = this.elapsed;
    slot.strength = strength;
    this.nextRippleIndex = (this.nextRippleIndex + 1) % GeminiAuraEngine.MAX_RIPPLES;
  }

  resize() {
    if (!this.canvas) return;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const w = Math.max(1, Math.floor((typeof window !== 'undefined' ? window.innerWidth : 800) * dpr));
    const h = Math.max(1, Math.floor((typeof window !== 'undefined' ? window.innerHeight : 600) * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  _initWebGL() {
    if (!this.canvas || typeof this.canvas.getContext !== 'function') return false;

    const VS_SOURCE = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const FS_SOURCE = `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif

      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uBreathTime;

      uniform vec3 uBaseOuter;
      uniform vec3 uBaseInner;
      uniform vec3 uLobe1;
      uniform vec3 uLobe2;
      uniform vec3 uLobe3;
      uniform vec3 uLobe4;

      uniform vec2 uPointer;
      uniform vec2 uTrail;
      uniform vec2 uPointerVel;
      uniform float uPointerActive;
      uniform float uHold;
      uniform float uFocusBoost;
      uniform float uLightMode;

      uniform vec4 uRipples[6];

      uniform float uGlowIntensity;
      uniform float uPointerPull;
      uniform float uGrain;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(
          0.211324865405187,
          0.366025403784439,
          -0.577350269189626,
          0.024390243902439
        );
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float triangularDither(vec2 fragCoord, float t) {
        float frameOffset = fract(t * 11.17);
        vec2 p1 = fragCoord + vec2(frameOffset * 173.0, frameOffset * 311.0);
        vec2 p2 = p1 + vec2(37.2, 71.8);
        float n1 = fract(52.9829189 * fract(dot(p1, vec2(0.06711056, 0.00583715))));
        float n2 = fract(52.9829189 * fract(dot(p2, vec2(0.06711056, 0.00583715))));
        return (n1 + n2 - 1.0);
      }

      float ellipseField(vec2 coord, vec2 center, vec2 radii) {
        vec2 d = (coord - center) / radii;
        return exp(-dot(d, d));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        float aspect = uResolution.x / max(1.0, uResolution.y);
        float minDim = min(uResolution.x, uResolution.y);

        vec2 pIso = (gl_FragCoord.xy - 0.5 * uResolution.xy) / minDim;
        vec2 mouseIso = (uPointer * uResolution - 0.5 * uResolution) / minDim;
        vec2 trailIso = (uTrail * uResolution - 0.5 * uResolution) / minDim;

        vec2 auraScale = vec2(
          mix(1.08, 0.92, smoothstep(0.6, 1.85, aspect)),
          mix(0.88, 1.24, smoothstep(0.6, 1.85, aspect))
        );
        vec2 haloOrigin = vec2(0.5, 0.455);
        vec2 h = (uv - haloOrigin) * auraScale;
        vec2 ptrDelta = (uPointer - haloOrigin) * auraScale;

        // 1. Click / Tap resonance ripples
        float rippleGlow = 0.0;
        float rippleCore = 0.0;
        vec2 rippleRefract = vec2(0.0);

        for (int i = 0; i < 6; i++) {
          vec4 rip = uRipples[i];
          float age = uTime - rip.z;
          if (age > 0.0 && age < 2.48) {
            float t = age / 2.42;
            vec2 ripIso = (rip.xy * uResolution - 0.5 * uResolution) / minDim;
            vec2 toRip = pIso - ripIso;
            float dist = length(toRip);

            float radius = 0.015 + pow(t, 0.70) * 0.92;
            float ringWidth = mix(0.065, 0.19, t);
            float ring = exp(-pow((dist - radius) / ringWidth, 2.0));
            float env = smoothstep(0.0, 0.08, t) * pow(max(0.0, 1.0 - t), 1.9) * rip.w;

            vec2 rDir = toRip / (dist + 0.0006);
            float gentleWave = sin((dist - radius) * 14.0 - age * 2.6) * ring;
            rippleRefract += rDir * gentleWave * env * 0.032;

            rippleGlow += ring * env;
            rippleCore += exp(-dist * dist * 10.5) * exp(-age * 2.9) * rip.w;
          }
        }

        vec2 hRefract = h + rippleRefract;

        // 2. Organic breathing noise
        float bt = uBreathTime * 0.16;
        float nA = snoise(hRefract * 0.72 + vec2(bt * 0.45, -bt * 0.25));
        float nB = snoise(hRefract * 0.58 + vec2(-bt * 0.32, bt * 0.38) + vec2(4.7, 2.1));
        vec2 softWarp = vec2(nA, nB) * 0.048;
        vec2 hSoft = hRefract + softWarp;

        // 3. Multi-depth parallax & gather bias
        float pull = uPointerPull * uPointerActive;
        float hold = uHold;
        vec2 gatherBias = ptrDelta * (hold * 0.24 * max(uPointerPull, 0.45));

        float b1 = 1.0 + 0.045 * sin(bt * 1.15);
        float b2 = 1.0 + 0.055 * cos(bt * 0.92 + 1.1);
        float b3 = 1.0 + 0.050 * sin(bt * 0.78 + 2.4);
        float b4 = 1.0 + 0.060 * cos(bt * 0.65 + 3.7);

        vec2 c1 = vec2(0.015 * sin(bt * 0.7), -0.015 + 0.012 * cos(bt * 0.6))
                + ptrDelta * (0.065 * pull) + gatherBias * 0.65;
        float f1 = ellipseField(hSoft, c1, vec2(0.46, 0.35) * b1);

        vec2 c2 = vec2(0.055 + 0.035 * cos(bt * 0.55), -0.02 + 0.025 * sin(bt * 0.62))
                + ptrDelta * (0.115 * pull) + gatherBias * 0.85;
        float f2 = ellipseField(hSoft, c2, vec2(0.37, 0.27) * b2);

        vec2 c3 = vec2(-0.06 + 0.04 * sin(bt * 0.48 + 1.5), 0.018 + 0.028 * cos(bt * 0.52))
                + ptrDelta * (0.175 * pull) + gatherBias * 1.05;
        float f3 = ellipseField(hSoft, c3, vec2(0.32, 0.24) * b3);

        vec2 c4 = vec2(0.02 * cos(bt * 0.42 + 2.8), -0.045 + 0.025 * sin(bt * 0.46))
                + ptrDelta * (0.22 * pull) + gatherBias * 1.15;
        float f4 = ellipseField(hSoft, c4, vec2(0.42, 0.29) * b4);

        float organicMod = 0.94 + 0.09 * (0.5 + 0.5 * nA);
        float coreElevation = 1.0 + uFocusBoost * 0.36;

        // 4. Base & Halo compositing
        float outerVignette = ellipseField(h, vec2(0.0, 0.0), vec2(0.66, 0.56));
        vec3 col = mix(uBaseOuter, uBaseInner, smoothstep(0.0, 0.85, outerVignette));
        float glowScale = uGlowIntensity * organicMod * coreElevation;

        vec3 haloAccum = vec3(0.0);
        haloAccum += uLobe1 * (f1 * 0.95);
        haloAccum += uLobe2 * (f2 * 0.68);
        haloAccum += uLobe3 * (f3 * 0.44);
        haloAccum += uLobe4 * (f4 * 0.36 * (0.85 + 0.15 * nB));

        if (uLightMode > 0.5) {
          // In light mode, soft serene atmospheric wash
          col = mix(col, haloAccum, clamp(glowScale * 0.45 * (f1 + f2 * 0.8), 0.0, 0.48));
        } else {
          // In dark mode, deep screen-like matte blend on obsidian
          col += haloAccum * glowScale * (1.0 - col * 0.45);
        }

        // 5. Pointer Luminescence, Wake & Awaken Hold Bloom
        vec2 toMouse = pIso - mouseIso;
        float dMouse = length(toMouse);
        float dTrail = length(pIso - trailIso);

        float cursorMist = exp(-dMouse * dMouse * 4.4) * pull;
        vec3 cursorColor = mix(uLobe2, uLobe3, 0.55);
        col += cursorColor * cursorMist * (uLightMode > 0.5 ? 0.14 : 0.24) * (1.0 - col * 0.4);

        float speedMag = min(1.0, length(uPointerVel) * 1.45);
        float wakeMist = exp(-dTrail * dTrail * 3.1) * pull * speedMag;
        col += mix(uLobe3, uLobe4, 0.4) * wakeMist * (uLightMode > 0.5 ? 0.12 : 0.22) * (1.0 - col * 0.45);

        float listenPulse = 0.90 + 0.10 * sin(uTime * 2.5);
        float holdOuter = exp(-dMouse * dMouse * 3.0) * hold * listenPulse;
        float holdInner = exp(-dMouse * dMouse * 8.2) * hold * listenPulse;
        vec3 awakenTint = mix(uLobe2, uLobe3, 0.65) * 1.18 + vec3(0.03, 0.05, 0.10);
        col += awakenTint * (holdOuter * 0.34 + holdInner * 0.20) * (1.0 - col * 0.48);

        vec3 rippleTint = mix(uLobe3, vec3(0.45, 0.62, 0.98), 0.22);
        col += rippleTint * rippleGlow * (uLightMode > 0.5 ? 0.18 : 0.28) * (1.0 - col * 0.42);
        col += mix(uLobe2, uLobe3, 0.65) * rippleCore * (uLightMode > 0.5 ? 0.15 : 0.22) * (1.0 - col * 0.45);

        // 6. Tone Compression & Micro-dithering
        if (uLightMode <= 0.5) {
          col = col / (1.0 + col * 0.42);
          float cornerMask = smoothstep(0.98, 0.14, length((uv - vec2(0.5, 0.47)) * vec2(1.08, 1.18)));
          col = mix(uBaseOuter, col, 0.38 + 0.62 * cornerMask);
          float topFade = smoothstep(1.04, 0.62, uv.y);
          col = mix(uBaseOuter, col, 0.55 + 0.45 * topFade);
        }

        float dither = triangularDither(gl_FragCoord.xy, uTime);
        float grainAmp = 0.0055 + 0.0155 * uGrain;
        col += dither * grainAmp;

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;

    try {
      const opts = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      };
      const gl = this.canvas.getContext('webgl', opts) || this.canvas.getContext('experimental-webgl', opts);
      if (!gl) return false;

      const vs = this._compileShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
      const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
      if (!vs || !fs) return false;

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('GeminiAuraEngine link error:', gl.getProgramInfoLog(prog));
        return false;
      }

      gl.useProgram(prog);

      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(prog, 'aPosition');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      this.gl = gl;
      this.program = prog;
      this.vbo = vbo;
      this.uniforms = {
        uResolution: gl.getUniformLocation(prog, 'uResolution'),
        uTime: gl.getUniformLocation(prog, 'uTime'),
        uBreathTime: gl.getUniformLocation(prog, 'uBreathTime'),
        uBaseOuter: gl.getUniformLocation(prog, 'uBaseOuter'),
        uBaseInner: gl.getUniformLocation(prog, 'uBaseInner'),
        uLobe1: gl.getUniformLocation(prog, 'uLobe1'),
        uLobe2: gl.getUniformLocation(prog, 'uLobe2'),
        uLobe3: gl.getUniformLocation(prog, 'uLobe3'),
        uLobe4: gl.getUniformLocation(prog, 'uLobe4'),
        uPointer: gl.getUniformLocation(prog, 'uPointer'),
        uTrail: gl.getUniformLocation(prog, 'uTrail'),
        uPointerVel: gl.getUniformLocation(prog, 'uPointerVel'),
        uPointerActive: gl.getUniformLocation(prog, 'uPointerActive'),
        uHold: gl.getUniformLocation(prog, 'uHold'),
        uFocusBoost: gl.getUniformLocation(prog, 'uFocusBoost'),
        uLightMode: gl.getUniformLocation(prog, 'uLightMode'),
        uRipples: gl.getUniformLocation(prog, 'uRipples'),
        uGlowIntensity: gl.getUniformLocation(prog, 'uGlowIntensity'),
        uPointerPull: gl.getUniformLocation(prog, 'uPointerPull'),
        uGrain: gl.getUniformLocation(prog, 'uGrain'),
      };

      this.rendererMode = 'webgl';
      return true;
    } catch (err) {
      console.warn('GeminiAuraEngine WebGL fallback triggered:', err);
      return false;
    }
  }

  _compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('GeminiAuraEngine shader warning:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  _init2DFallback() {
    this.rendererMode = '2d';
    if (!this.canvas || typeof this.canvas.getContext !== 'function') return;
    this.ctx2d = this.canvas.getContext('2d');

    if (typeof document !== 'undefined') {
      const tile = document.createElement('canvas');
      tile.width = 96;
      tile.height = 96;
      const tctx = tile.getContext('2d');
      if (tctx) {
        const img = tctx.createImageData(96, 96);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.floor(Math.random() * 255);
          img.data[i] = v;
          img.data[i + 1] = v;
          img.data[i + 2] = v;
          img.data[i + 3] = 14;
        }
        tctx.putImageData(img, 0, 0);
        if (this.ctx2d) {
          this.grainTile2d = this.ctx2d.createPattern(tile, 'repeat');
        }
      }
    }
  }

  _rgbCss(vec, alpha) {
    const r = Math.round(Math.min(1, Math.max(0, vec[0])) * 255);
    const g = Math.round(Math.min(1, Math.max(0, vec[1])) * 255);
    const b = Math.round(Math.min(1, Math.max(0, vec[2])) * 255);
    return alpha === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  }

  _render2D() {
    if (!this.ctx2d) return;
    const ctx = this.ctx2d;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const c = this.colors;
    const bt = this.breathTime * 0.18;
    const glow = this.tuning.glowIntensity * (1 + (this.focusBoost + this.typingPulse) * 0.35);
    const pull = this.tuning.pointerPull * this.pointerPresence;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this._rgbCss(c.baseOuter);
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.545;
    const px = this.pointer.x * w;
    const py = (1 - this.pointer.y) * h;
    const dx = px - cx;
    const dy = py - cy;

    const drawEllipseLobe = (x, y, rx, ry, colorVec, alpha) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, this._rgbCss(colorVec, Math.min(0.85, alpha)));
      g.addColorStop(0.5, this._rgbCss(colorVec, Math.min(0.45, alpha * 0.42)));
      g.addColorStop(1, this._rgbCss(colorVec, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    ctx.globalCompositeOperation = this.isLightMode ? 'source-over' : 'screen';

    const gather = this.holdStrength * 0.22;
    drawEllipseLobe(
      cx + dx * (0.06 * pull + gather * 0.6),
      cy + dy * (0.06 * pull + gather * 0.6),
      w * (0.48 + 0.02 * Math.sin(bt)),
      h * (0.38 + 0.02 * Math.cos(bt)),
      c.lobe1,
      0.78 * glow
    );
    drawEllipseLobe(
      cx + w * 0.04 * Math.cos(bt * 0.7) + dx * (0.12 * pull + gather * 0.8),
      cy + h * 0.02 * Math.sin(bt * 0.8) + dy * (0.12 * pull + gather * 0.8),
      w * 0.39,
      h * 0.30,
      c.lobe2,
      0.54 * glow
    );
    drawEllipseLobe(
      cx - w * 0.05 * Math.sin(bt * 0.6) + dx * (0.17 * pull + gather),
      cy - h * 0.02 + dy * (0.17 * pull + gather),
      w * 0.34,
      h * 0.26,
      c.lobe3,
      0.36 * glow
    );
    drawEllipseLobe(
      cx + dx * (0.21 * pull + gather),
      cy + h * 0.03 + dy * (0.21 * pull + gather),
      w * 0.40,
      h * 0.28,
      c.lobe4,
      0.28 * glow
    );

    const minDim = Math.min(w, h);
    if (pull > 0.01 || this.holdStrength > 0.01) {
      const rad = minDim * (0.28 + this.holdStrength * 0.14);
      const alpha = 0.16 * pull + 0.32 * this.holdStrength;
      drawEllipseLobe(px, py, rad, rad, c.lobe3, alpha);
    }

    for (let i = 0; i < GeminiAuraEngine.MAX_RIPPLES; i++) {
      const r = this.ripples[i];
      const age = this.elapsed - r.startTime;
      if (age > 0 && age < 2.42) {
        const t = age / 2.42;
        const rx = r.x * w;
        const ry = (1 - r.y) * h;
        const radius = (0.015 + Math.pow(t, 0.7) * 0.88) * minDim;
        const alpha = Math.pow(1 - t, 1.9) * 0.28 * r.strength;
        ctx.beginPath();
        ctx.arc(rx, ry, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this._rgbCss(c.lobe3, alpha);
        ctx.lineWidth = Math.max(3, minDim * (0.035 + 0.04 * t));
        ctx.stroke();
      }
    }

    if (this.grainTile2d && this.tuning.matteGrain > 0.02) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = Math.min(1, this.tuning.matteGrain * 0.5);
      ctx.fillStyle = this.grainTile2d;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  _lerpVec3(cur, target, alpha) {
    cur[0] += (target[0] - cur[0]) * alpha;
    cur[1] += (target[1] - cur[1]) * alpha;
    cur[2] += (target[2] - cur[2]) * alpha;
  }

  _stepCriticallyDamped(pos, vel, target, omega, dt) {
    const f = 1 + omega * dt;
    const expTerm = Math.exp(-omega * dt);
    const disp = pos - target;
    const newPos = target + (disp * f + vel * dt) * expTerm;
    const newVel = (vel - disp * (omega * omega * dt)) * expTerm;
    return [newPos, newVel];
  }

  _tick(nowMs) {
    this.rafId = requestAnimationFrame(this._animate);

    const dt = Math.min(0.05, Math.max(0.001, (nowMs - this.lastMs) / 1000));
    this.lastMs = nowMs;
    this.elapsed += dt;

    const tuneEase = 1 - Math.exp(-dt * 8.5);
    this.tuning.glowIntensity += (this.targetTuning.glowIntensity - this.tuning.glowIntensity) * tuneEase;
    this.tuning.breathSpeed += (this.targetTuning.breathSpeed - this.tuning.breathSpeed) * tuneEase;
    this.tuning.pointerPull += (this.targetTuning.pointerPull - this.tuning.pointerPull) * tuneEase;
    this.tuning.matteGrain += (this.targetTuning.matteGrain - this.tuning.matteGrain) * tuneEase;

    this.breathTime += dt * this.tuning.breathSpeed;

    const targetPal = GeminiAuraEngine.PRESETS[this.presetKey] || GeminiAuraEngine.PRESETS.geminiCobalt;
    const palEase = 1 - Math.exp(-dt * 2.85);
    this._lerpVec3(this.colors.baseOuter, targetPal.baseOuter, palEase);
    this._lerpVec3(this.colors.baseInner, targetPal.baseInner, palEase);
    this._lerpVec3(this.colors.lobe1, targetPal.lobe1, palEase);
    this._lerpVec3(this.colors.lobe2, targetPal.lobe2, palEase);
    this._lerpVec3(this.colors.lobe3, targetPal.lobe3, palEase);
    this._lerpVec3(this.colors.lobe4, targetPal.lobe4, palEase);

    const prevX = this.pointer.x;
    const prevY = this.pointer.y;
    const [nx, nvx] = this._stepCriticallyDamped(this.pointer.x, this.pointerSpringVel.x, this.pointerTarget.x, 7.2, dt);
    const [ny, nvy] = this._stepCriticallyDamped(this.pointer.y, this.pointerSpringVel.y, this.pointerTarget.y, 7.2, dt);
    this.pointer.x = nx;
    this.pointer.y = ny;
    this.pointerSpringVel.x = nvx;
    this.pointerSpringVel.y = nvy;

    const trailEase = 1 - Math.exp(-dt * 2.9);
    this.trail.x += (this.pointer.x - this.trail.x) * trailEase;
    this.trail.y += (this.pointer.y - this.trail.y) * trailEase;

    const instVx = (this.pointer.x - prevX) / dt;
    const instVy = (this.pointer.y - prevY) / dt;
    const velEase = 1 - Math.exp(-dt * 5.8);
    this.visualVel.x += (Math.max(-1.2, Math.min(1.2, instVx * 0.35)) - this.visualVel.x) * velEase;
    this.visualVel.y += (Math.max(-1.2, Math.min(1.2, instVy * 0.35)) - this.visualVel.y) * velEase;

    this.pointerPresence += (this.pointerPresenceTarget - this.pointerPresence) * (1 - Math.exp(-dt * 3.4));
    const holdTarget = this.isHolding ? 1.0 : 0.0;
    this.holdStrength += (holdTarget - this.holdStrength) * (1 - Math.exp(-dt * (this.isHolding ? 2.6 : 4.0)));
    this.focusBoost += (this.focusBoostTarget - this.focusBoost) * (1 - Math.exp(-dt * 3.2));
    this.typingPulse *= Math.exp(-dt * 3.0);

    if (this.rendererMode === 'webgl') {
      this._renderWebGL();
    } else {
      this._render2D();
    }
  }

  _renderWebGL() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    const u = this.uniforms;
    const c = this.colors;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, this.elapsed);
    gl.uniform1f(u.uBreathTime, this.breathTime);

    gl.uniform3fv(u.uBaseOuter, c.baseOuter);
    gl.uniform3fv(u.uBaseInner, c.baseInner);
    gl.uniform3fv(u.uLobe1, c.lobe1);
    gl.uniform3fv(u.uLobe2, c.lobe2);
    gl.uniform3fv(u.uLobe3, c.lobe3);
    gl.uniform3fv(u.uLobe4, c.lobe4);

    gl.uniform2f(u.uPointer, this.pointer.x, this.pointer.y);
    gl.uniform2f(u.uTrail, this.trail.x, this.trail.y);
    gl.uniform2f(u.uPointerVel, this.visualVel.x, this.visualVel.y);
    gl.uniform1f(u.uPointerActive, this.pointerPresence);
    gl.uniform1f(u.uHold, this.holdStrength);
    gl.uniform1f(u.uFocusBoost, this.focusBoost + this.typingPulse);
    gl.uniform1f(u.uLightMode, this.isLightMode ? 1.0 : 0.0);

    for (let i = 0; i < GeminiAuraEngine.MAX_RIPPLES; i++) {
      const r = this.ripples[i];
      const off = i * 4;
      this.rippleBuffer[off] = r.x;
      this.rippleBuffer[off + 1] = r.y;
      this.rippleBuffer[off + 2] = r.startTime;
      this.rippleBuffer[off + 3] = r.strength;
    }
    gl.uniform4fv(u.uRipples, this.rippleBuffer);

    gl.uniform1f(u.uGlowIntensity, this.tuning.glowIntensity);
    gl.uniform1f(u.uPointerPull, this.tuning.pointerPull);
    gl.uniform1f(u.uGrain, this.tuning.matteGrain);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

/**
 * Mounts the Gemini Atmospheric Aura engine inside the given container.
 * Returns an instance object with update() and destroy() methods.
 */
export function mountAurora(containerEl, userOptions = {}) {
  if (!containerEl || typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      update() {},
      triggerRipple() {},
      setFocusBoost() {},
      nudgeTypingPulse() {},
      destroy() {}
    };
  }

  let canvas = containerEl.querySelector('canvas');
  let createdCanvas = false;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'aurora-canvas fixed inset-0 w-full h-full pointer-events-none z-0';
    canvas.setAttribute('aria-hidden', 'true');
    containerEl.appendChild(canvas);
    createdCanvas = true;
  }

  const isLight = Boolean(userOptions.lightMode);
  const engine = new GeminiAuraEngine(canvas, {
    lightMode: isLight,
    tuning: {
      glowIntensity: isLight ? 0.65 : 1.0,
      breathSpeed: 1.0,
      pointerPull: 1.0,
      matteGrain: 0.7
    }
  });

  function clientToNorm(clientX, clientY) {
    return {
      x: Math.min(1, Math.max(0, clientX / window.innerWidth)),
      y: Math.min(1, Math.max(0, 1 - clientY / window.innerHeight)),
    };
  }

  const handlePointerMove = (e) => {
    const p = clientToNorm(e.clientX, e.clientY);
    engine.updatePointer(p.x, p.y);
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    const p = clientToNorm(e.clientX, e.clientY);
    engine.beginHold(p.x, p.y, e.pointerType === 'touch');
  };

  const handlePointerUp = (e) => {
    const p = clientToNorm(e.clientX, e.clientY);
    engine.endHold(p.x, p.y);
  };

  const handlePointerCancel = () => {
    engine.endHold();
  };

  const handlePointerLeave = () => {
    engine.setPointerPresent(false);
  };

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true });
  window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
  document.addEventListener('pointerleave', handlePointerLeave, { passive: true });

  engine.start();

  return {
    engine,
    update(newOptions = {}) {
      if (newOptions.lightMode !== undefined) {
        engine.setLightMode(newOptions.lightMode);
        engine.setTuning({ glowIntensity: newOptions.lightMode ? 0.65 : 1.0 });
      }
      if (newOptions.preset) {
        engine.setPreset(newOptions.preset);
      }
      if (newOptions.tuning) {
        engine.setTuning(newOptions.tuning);
      }
    },
    triggerRipple(normX, normY, strength) {
      engine.triggerRipple(normX, normY, strength);
    },
    setFocusBoost(active, level) {
      engine.setFocusBoost(active, level);
    },
    nudgeTypingPulse(amount) {
      engine.nudgeTypingPulse(amount);
    },
    destroy() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      document.removeEventListener('pointerleave', handlePointerLeave);
      engine.destroy();
      if (createdCanvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };
}
