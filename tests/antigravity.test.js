import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mountAntigravity,
  DEFAULT_ANTIGRAVITY_COLORS,
  SHAPES,
  COLOR_MODES,
  clamp,
  parseColor,
  toOklab,
  fromOklab,
  buildPalette
} from '../js/antigravity.js';

test('Antigravity: Module exports functions, constants, and math utilities', () => {
  assert.equal(typeof mountAntigravity, 'function', 'mountAntigravity must be an exported function');
  assert.deepEqual(DEFAULT_ANTIGRAVITY_COLORS, ['#fdbdbd', '#87e0fe', '#ffaa84'], 'DEFAULT_ANTIGRAVITY_COLORS must match target palette');
  assert.equal(SHAPES.capsule, 0);
  assert.equal(COLOR_MODES.conic, 0);
});

test('Antigravity: OKLab color conversion and palette generation produces valid texture data', () => {
  // Test clamping
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(5, 0, 10), 5);

  // Test hex color parsing
  const parsed = parseColor('#87e0fe');
  assert.ok(Array.isArray(parsed));
  assert.equal(parsed.length, 3);
  assert.ok(parsed[0] > 0.5 && parsed[1] > 0.8 && parsed[2] > 0.9);

  // Test OKLab roundtrip
  const lab = toOklab([0.5, 0.8, 0.9]);
  assert.ok(Array.isArray(lab));
  assert.equal(lab.length, 3);
  const rgb = fromOklab(lab);
  assert.ok(Array.isArray(rgb));
  assert.equal(rgb.length, 3);
  assert.ok(Math.abs(rgb[0] - 0.5) < 0.05);

  // Test buildPalette: 256 width * 2 rows * 4 channels (RGBA) = 2048 bytes
  const paletteDark = buildPalette(DEFAULT_ANTIGRAVITY_COLORS, false);
  assert.ok(paletteDark instanceof Uint8Array);
  assert.equal(paletteDark.length, 256 * 2 * 4, 'Palette texture must be 256x2 RGBA (2048 bytes)');

  const paletteLight = buildPalette(DEFAULT_ANTIGRAVITY_COLORS, true);
  assert.ok(paletteLight instanceof Uint8Array);
  assert.equal(paletteLight.length, 256 * 2 * 4);
});

test('Antigravity: mountAntigravity safely handles missing DOM / SSR environment', () => {
  const instance = mountAntigravity(null, { count: 1000 });
  assert.ok(instance, 'Must return instance object');
  assert.equal(typeof instance.update, 'function', 'update method must exist');
  assert.equal(typeof instance.destroy, 'function', 'destroy method must exist');

  // Calling methods in headless environment should not throw
  assert.doesNotThrow(() => {
    instance.update({ lightMode: true, opacity: 0.35 });
    instance.destroy();
  });
});
