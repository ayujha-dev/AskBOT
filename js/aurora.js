/**
 * Aurora: Interactive Gemini-Style Atmospheric Canvas Simulation
 * Features: Fluid low-contrast light curtain anchored across top and sides in
 * matte sapphire (#2B5B9E), soft periwinkle (#4B6CB7), muted ice-cyan (#3A7CA5),
 * and subtle lavender-slate (#5C548E).
 * Includes smooth pointer tracking glow, liquid-light click ripples (1.4s decay),
 * light/dark theme calibration, and zero-leak lifecycle cleanup.
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

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      update() {},
      destroy() {
        if (createdCanvas && canvas.parentNode) canvas.remove();
      }
    };
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
  let lastTime = 0;
  let visible = true;
  let pageVisible = typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true;
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Interaction State
  const pointer = { x: 0.5, y: 0.25, inside: false };
  const cursor = { x: 0.5, y: 0.25 };
  let ripples = [];

  // Wave harmonic parameters (phase, frequency, amplitude)
  const waves = [
    { freq: 0.0018, speed: 0.00045, amp: 0.28, phase: 0.0, colorIdx: 0, yOffset: 0.15 },
    { freq: 0.0024, speed: 0.00062, amp: 0.22, phase: 1.8, colorIdx: 1, yOffset: 0.22 },
    { freq: 0.0031, speed: 0.00038, amp: 0.18, phase: 3.4, colorIdx: 2, yOffset: 0.18 },
    { freq: 0.0015, speed: 0.00052, amp: 0.25, phase: 4.9, colorIdx: 3, yOffset: 0.28 }
  ];

  let width = 1;
  let height = 1;
  let dpr = 1;

  const resize = () => {
    if (isDestroyed || !containerEl || !canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, containerEl.clientWidth || window.innerWidth || 1);
    height = Math.max(1, containerEl.clientHeight || window.innerHeight || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const locate = event => {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    pointer.x = Math.max(0, Math.min(1, x / Math.max(1, rect.width)));
    pointer.y = Math.max(0, Math.min(1, y / Math.max(1, rect.height)));
  };

  const onPointerMove = event => {
    locate(event);
    wake();
  };

  const onPointerDown = event => {
    locate(event);
    if (reduceMotion || !currentSettings.interactive) return;

    // Spawn liquid-light ripple
    const rect = containerEl.getBoundingClientRect();
    ripples.push({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      startTime: performance.now(),
      maxRadius: Math.min(width, height) * 0.45
    });
    wake();
  };

  const onVisibility = () => {
    pageVisible = typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true;
    lastTime = 0;
    wake();
  };

  const render = (now) => {
    if (isDestroyed || !ctx || width <= 0 || height <= 0) return;

    const s = currentSettings;
    const isLight = s.lightMode;
    ctx.clearRect(0, 0, width, height);

    // Smooth lerp cursor glow
    const lerpSpeed = 0.045;
    cursor.x += (pointer.x - cursor.x) * lerpSpeed;
    cursor.y += (pointer.y - cursor.y) * lerpSpeed;

    const cursorPixelX = cursor.x * width;
    const cursorPixelY = cursor.y * height;

    // 1. Draw dynamic flowing wave curtains
    waves.forEach((w) => {
      const colorHex = s.colors[w.colorIdx % s.colors.length];
      const baseAlpha = (isLight ? 0.32 : 0.45) * s.opacity;

      ctx.save();
      ctx.globalCompositeOperation = isLight ? 'source-over' : 'screen';

      const gradient = ctx.createLinearGradient(0, 0, 0, height * (w.yOffset + w.amp + 0.35));
      gradient.addColorStop(0, hexToRgba(colorHex, baseAlpha * 1.2));
      gradient.addColorStop(0.4, hexToRgba(colorHex, baseAlpha * 0.75));
      gradient.addColorStop(1, hexToRgba(colorHex, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);

      // Curve points across width
      const step = 40;
      for (let x = width; x >= 0; x -= step) {
        // Multi-frequency wave
        const waveTime = reduceMotion ? 0 : now * w.speed * s.speed;
        let y = Math.sin(x * w.freq + waveTime + w.phase) * (height * w.amp * 0.45)
              + Math.cos(x * w.freq * 0.5 - waveTime * 0.7) * (height * w.amp * 0.25)
              + height * w.yOffset;

        // Subtle cursor attraction / bending
        if (s.interactive && !reduceMotion) {
          const dx = x - cursorPixelX;
          const dist = Math.abs(dx);
          const influenceRadius = width * 0.35;
          if (dist < influenceRadius) {
            const factor = Math.cos((dist / influenceRadius) * (Math.PI / 2));
            y += (cursorPixelY - y) * factor * 0.18;
          }
        }

        ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // 2. Draw Interactive Cursor Luminous Glow
    if (s.interactive && pointer.inside && !reduceMotion) {
      ctx.save();
      ctx.globalCompositeOperation = isLight ? 'source-over' : 'screen';
      const glowRadius = Math.min(width, height) * 0.42;
      const glowGrad = ctx.createRadialGradient(
        cursorPixelX, cursorPixelY, 0,
        cursorPixelX, cursorPixelY, glowRadius
      );
      const glowColor = s.colors[1] || '#4B6CB7';
      const glowAlpha = (isLight ? 0.22 : 0.35) * s.opacity;

      glowGrad.addColorStop(0, hexToRgba(glowColor, glowAlpha));
      glowGrad.addColorStop(0.5, hexToRgba(s.colors[2] || '#3A7CA5', glowAlpha * 0.4));
      glowGrad.addColorStop(1, hexToRgba(glowColor, 0));

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cursorPixelX, cursorPixelY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Draw Liquid-Light Click Ripples (1.4s dissipation)
    if (ripples.length > 0) {
      const activeRipples = [];
      const durationMs = s.rippleDuration * 1000;

      ripples.forEach(r => {
        const elapsed = now - r.startTime;
        const progress = elapsed / durationMs;
        if (progress < 1) {
          activeRipples.push(r);
          const currentRadius = progress * r.maxRadius;
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const alpha = (1 - progress) * (isLight ? 0.28 : 0.42) * s.opacity;

          ctx.save();
          ctx.globalCompositeOperation = isLight ? 'source-over' : 'screen';

          const rippleGrad = ctx.createRadialGradient(
            r.x, r.y, Math.max(0, currentRadius * 0.5),
            r.x, r.y, currentRadius
          );
          const rippleColor = s.colors[2] || '#3A7CA5';
          rippleGrad.addColorStop(0, hexToRgba(rippleColor, 0));
          rippleGrad.addColorStop(0.7, hexToRgba(rippleColor, alpha * 0.8));
          rippleGrad.addColorStop(0.9, hexToRgba('#87e0fe', alpha));
          rippleGrad.addColorStop(1, hexToRgba(rippleColor, 0));

          ctx.fillStyle = rippleGrad;
          ctx.beginPath();
          ctx.arc(r.x, r.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      ripples = activeRipples;
    }
  };

  const frame = (now) => {
    raf = 0;
    if (isDestroyed || !visible || !pageVisible) return;

    render(now);

    const needsNextFrame = !reduceMotion || ripples.length > 0;
    if (needsNextFrame && !isDestroyed) {
      raf = requestAnimationFrame(frame);
    }
  };

  const wake = () => {
    if (!raf && visible && pageVisible && !isDestroyed) {
      raf = requestAnimationFrame(frame);
    }
  };

  // Event Listeners & Observers
  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(containerEl);
  }

  let intersectionObserver = null;
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        lastTime = 0;
        wake();
      }
    });
    intersectionObserver.observe(containerEl);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
  }

  resize();
  wake();

  return {
    update(newOptions = {}) {
      if (isDestroyed) return;
      currentSettings = {
        ...currentSettings,
        ...parseSettings({
          ...currentSettings,
          ...newOptions
        })
      };
      wake();
    },
    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;
      cancelAnimationFrame(raf);
      raf = 0;

      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();

      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerdown', onPointerDown);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }

      ripples = [];
      if (createdCanvas && canvas.parentNode) {
        canvas.remove();
      }
    }
  };
}

function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== 'string') return `rgba(75, 108, 183, ${alpha})`;
  const clean = hex.replace('#', '').trim();
  let r = 75, g = 108, b = 183;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}
