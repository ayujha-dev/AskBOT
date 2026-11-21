/**
 * Aurora: Volumetric Gemini-Style Atmospheric Aurora Simulation
 * Powered by WebGL2 Fractional Brownian Motion (FBM) & Simplex Noise Domain Warping
 * Features:
 * - True vertically diffused light curtains with organic shimmer and drift
 * - Passive cursor wake tracking that warps noise plasma
 * - Radial click ripple bloom with ~1.5s decay
 * - Automatic Dark/Light mode color calibration
 * - 2D procedural canvas fallback if WebGL2 is unavailable
 * - Clean lifecycle disposal with zero leaks
 */

export const DEFAULT_AURORA_OPTIONS = {
  colors: ['#2B5B9E', '#4B6CB7', '#3A7CA5', '#5C548E'],
  lightMode: false,
  opacity: 0.85,
  speed: 1.0,
  interactive: true,
  rippleDuration: 1.4 // seconds
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

function parseHexColor(hex) {
  if (typeof hex !== 'string') return [0.17, 0.36, 0.62];
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length < 6) return [0.17, 0.36, 0.62];
  const num = parseInt(h.slice(0, 6), 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  ];
}

const VS_SOURCE = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS_SOURCE = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_pointer_active;
uniform vec4 u_ripple; // x, y, start_time, duration
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_opacity;
uniform float u_light_mode;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,
                      0.366025403784439,
                     -0.577350269189626,
                      0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
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

float fbm(vec2 p) {
  float val = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 4; i++) {
    val += amp * (snoise(p * freq) * 0.5 + 0.5);
    p += vec2(0.42, 0.68);
    freq *= 2.02;
    amp *= 0.48;
  }
  return val;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  // Invert y so top of viewport is 1.0
  vec2 p = uv;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.14;

  // Pointer wake warp
  vec2 ptr = u_pointer;
  ptr.x *= u_resolution.x / u_resolution.y;
  float distPtr = length(p - ptr);
  vec2 mouseWarp = vec2(0.0);
  if (u_pointer_active > 0.01) {
    float mouseStrength = exp(-distPtr * 3.0) * 0.25 * u_pointer_active;
    mouseWarp = normalize(p - ptr + 0.0001) * mouseStrength;
  }

  // Click ripple interaction
  float rippleDist = length(uv - u_ripple.xy);
  float rippleAge = u_time - u_ripple.z;
  float rippleWave = 0.0;
  if (rippleAge >= 0.0 && rippleAge < u_ripple.w) {
    float normAge = rippleAge / u_ripple.w;
    float ringRadius = normAge * 0.9;
    float ringDelta = abs(rippleDist - ringRadius);
    float ringFalloff = exp(-ringDelta * 16.0) * (1.0 - normAge);
    rippleWave = ringFalloff * 0.38;
  }

  // Domain warping for organic northern lights curtains
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.35) + mouseWarp),
                fbm(p + vec2(1.7, -t * 0.28) - mouseWarp));

  vec2 r = vec2(fbm(p + 1.4 * q + vec2(1.2, 0.6) + vec2(t * 0.25, t * 0.18)),
                fbm(p + 1.2 * q + vec2(2.8, 1.4) - vec2(t * 0.20, t * 0.30)));

  float f = fbm(p + 1.5 * r + mouseWarp * 0.6);

  // Soft vertical diffusion curtain
  float verticalFade = smoothstep(1.15, 0.05, uv.y);
  float sideGlow = 0.65 + 0.35 * (pow(abs(uv.x - 0.5) * 2.0, 1.3));
  float curtain = pow(f, 1.5) * verticalFade * sideGlow;
  curtain += rippleWave;

  // 4-stop Gemini Palette blending
  vec3 col = mix(u_color1, u_color2, clamp(f * 1.5, 0.0, 1.0));
  col = mix(col, u_color3, clamp(length(q), 0.0, 1.0));
  col = mix(col, u_color4, clamp(r.x * 1.3, 0.0, 1.0));

  // Soft pointer halo
  if (u_pointer_active > 0.01) {
    float cursorGlow = exp(-distPtr * 3.8) * 0.3 * u_pointer_active;
    col += u_color2 * cursorGlow;
  }

  float alpha;
  if (u_light_mode > 0.5) {
    alpha = clamp(curtain * u_opacity * 0.75, 0.0, 0.6);
    col = mix(col, vec3(0.96, 0.98, 1.0), 0.12);
  } else {
    alpha = clamp(curtain * u_opacity * 1.15, 0.0, 0.92);
  }

  fragColor = vec4(col, alpha);
}
`;

export function mountAurora(containerEl, userOptions = {}) {
  if (!containerEl || typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      update() {},
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

  const parseSettings = (opts = {}) => {
    const merged = { ...DEFAULT_AURORA_OPTIONS, ...opts };
    return {
      colors: Array.isArray(merged.colors) && merged.colors.length >= 4 ? merged.colors : DEFAULT_AURORA_OPTIONS.colors,
      lightMode: Boolean(merged.lightMode),
      opacity: typeof merged.opacity === 'number' ? Math.max(0, Math.min(1, merged.opacity)) : 0.85,
      speed: typeof merged.speed === 'number' ? Math.max(0.1, merged.speed) : 1.0,
      interactive: Boolean(merged.interactive),
      rippleDuration: typeof merged.rippleDuration === 'number' ? merged.rippleDuration : 1.4
    };
  };

  let currentSettings = parseSettings(userOptions);
  let isDestroyed = false;
  let raf = 0;
  let startTime = performance.now();
  let visible = true;
  let pageVisible = typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true;
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Interaction State
  const pointer = { x: 0.5, y: 0.3, active: 0.0 };
  const targetPointer = { x: 0.5, y: 0.3, active: 0.0 };
  let rippleState = { x: -1, y: -1, startTime: -10, duration: 1.5 };

  // Try WebGL2 first
  let gl = null;
  try {
    gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power'
    });
  } catch (err) {
    gl = null;
  }

  let program = null;
  let quadVao = null;
  let quadBuffer = null;
  let uResolution = null;
  let uTime = null;
  let uPointer = null;
  let uPointerActive = null;
  let uRipple = null;
  let uColor1 = null;
  let uColor2 = null;
  let uColor3 = null;
  let uColor4 = null;
  let uOpacity = null;
  let uLightMode = null;

  if (gl) {
    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Aurora shader compile failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);

    if (vs && fs) {
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        uResolution = gl.getUniformLocation(program, 'u_resolution');
        uTime = gl.getUniformLocation(program, 'u_time');
        uPointer = gl.getUniformLocation(program, 'u_pointer');
        uPointerActive = gl.getUniformLocation(program, 'u_pointer_active');
        uRipple = gl.getUniformLocation(program, 'u_ripple');
        uColor1 = gl.getUniformLocation(program, 'u_color1');
        uColor2 = gl.getUniformLocation(program, 'u_color2');
        uColor3 = gl.getUniformLocation(program, 'u_color3');
        uColor4 = gl.getUniformLocation(program, 'u_color4');
        uOpacity = gl.getUniformLocation(program, 'u_opacity');
        uLightMode = gl.getUniformLocation(program, 'u_light_mode');

        // Fullscreen quad
        quadVao = gl.createVertexArray();
        gl.bindVertexArray(quadVao);

        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        // Triangle strip covering -1..1
        const quadPositions = new Float32Array([
          -1.0, -1.0,
           1.0, -1.0,
          -1.0,  1.0,
           1.0,  1.0
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, quadPositions, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
      } else {
        console.warn('Aurora program link failed:', gl.getProgramInfoLog(program));
        gl = null;
      }
    } else {
      gl = null;
    }
  }

  // 2D fallback context if WebGL2 failed
  const ctx2d = gl ? null : canvas.getContext('2d');

  let width = 1;
  let height = 1;
  let dpr = 1;

  const resize = () => {
    if (isDestroyed || !containerEl || !canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, containerEl.clientWidth || window.innerWidth || 1);
    height = Math.max(1, containerEl.clientHeight || window.innerHeight || 1);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });

  const onPointerMove = (e) => {
    if (isDestroyed || !currentSettings.interactive) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    targetPointer.x = x;
    targetPointer.y = 1.0 - y; // OpenGL coordinates
    targetPointer.active = 1.0;
  };

  const onPointerDown = (e) => {
    if (isDestroyed || !currentSettings.interactive) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = 1.0 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const now = (performance.now() - startTime) / 1000;
    rippleState = {
      x,
      y,
      startTime: now,
      duration: currentSettings.rippleDuration
    };
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });

  const onVisibilityChange = () => {
    pageVisible = document.visibilityState !== 'hidden';
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // IntersectionObserver
  let io = null;
  if (typeof IntersectionObserver !== 'undefined' && containerEl) {
    io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    }, { threshold: 0.05 });
    io.observe(containerEl);
  }

  // Render loop
  const loop = (now) => {
    if (isDestroyed) return;

    if (visible && pageVisible) {
      const elapsed = (now - startTime) / 1000 * currentSettings.speed;

      // Lerp pointer smoothly
      pointer.x += (targetPointer.x - pointer.x) * 0.06;
      pointer.y += (targetPointer.y - pointer.y) * 0.06;
      pointer.active += (targetPointer.active - pointer.active) * 0.05;

      if (gl && program && quadVao) {
        gl.useProgram(program);

        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1f(uTime, elapsed);
        gl.uniform2f(uPointer, pointer.x, pointer.y);
        gl.uniform1f(uPointerActive, pointer.active);
        gl.uniform4f(uRipple, rippleState.x, rippleState.y, rippleState.startTime, rippleState.duration);

        const c1 = parseHexColor(currentSettings.colors[0]);
        const c2 = parseHexColor(currentSettings.colors[1]);
        const c3 = parseHexColor(currentSettings.colors[2]);
        const c4 = parseHexColor(currentSettings.colors[3]);

        gl.uniform3f(uColor1, c1[0], c1[1], c1[2]);
        gl.uniform3f(uColor2, c2[0], c2[1], c2[2]);
        gl.uniform3f(uColor3, c3[0], c3[1], c3[2]);
        gl.uniform3f(uColor4, c4[0], c4[1], c4[2]);

        gl.uniform1f(uOpacity, currentSettings.opacity);
        gl.uniform1f(uLightMode, currentSettings.lightMode ? 1.0 : 0.0);

        gl.bindVertexArray(quadVao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);
      } else if (ctx2d) {
        // 2D Procedural mesh fallback
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width;
        const h = canvas.height;
        const grad = ctx2d.createLinearGradient(0, 0, 0, h * 0.7);
        grad.addColorStop(0, currentSettings.colors[0]);
        grad.addColorStop(0.35, currentSettings.colors[1]);
        grad.addColorStop(0.7, currentSettings.colors[2]);
        grad.addColorStop(1, 'transparent');
        ctx2d.fillStyle = grad;
        ctx2d.globalAlpha = currentSettings.opacity * 0.4;
        ctx2d.fillRect(0, 0, w, h);
      }
    }

    raf = requestAnimationFrame(loop);
  };

  raf = requestAnimationFrame(loop);

  return {
    update(newOptions = {}) {
      currentSettings = parseSettings({ ...currentSettings, ...newOptions });
    },
    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (io) io.disconnect();

      if (gl) {
        if (quadBuffer) gl.deleteBuffer(quadBuffer);
        if (quadVao) gl.deleteVertexArray(quadVao);
        if (program) gl.deleteProgram(program);
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }

      if (createdCanvas && canvas.parentNode) {
        canvas.remove();
      }
    }
  };
}
