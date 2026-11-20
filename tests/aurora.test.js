import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mountAurora,
  DEFAULT_AURORA_OPTIONS,
  AURORA_LIGHT_OPTIONS,
  AURORA_DARK_OPTIONS
} from '../js/aurora.js';

test('Aurora: Module exports functions and constants', () => {
  assert.equal(typeof mountAurora, 'function', 'mountAurora must be an exported function');
  assert.ok(DEFAULT_AURORA_OPTIONS, 'DEFAULT_AURORA_OPTIONS must be exported');
  assert.deepEqual(DEFAULT_AURORA_OPTIONS.colors, ['#2B5B9E', '#4B6CB7', '#3A7CA5', '#5C548E']);
  assert.equal(DEFAULT_AURORA_OPTIONS.lightMode, false);
  assert.equal(DEFAULT_AURORA_OPTIONS.opacity, 0.85);
  assert.equal(DEFAULT_AURORA_OPTIONS.rippleDuration, 1.4);
});

test('Aurora: Light and dark mode option sets match Gemini palette specifications', () => {
  assert.equal(AURORA_LIGHT_OPTIONS.lightMode, true);
  assert.equal(AURORA_LIGHT_OPTIONS.opacity, 0.42);
  assert.ok(Array.isArray(AURORA_LIGHT_OPTIONS.colors));

  assert.equal(AURORA_DARK_OPTIONS.lightMode, false);
  assert.equal(AURORA_DARK_OPTIONS.opacity, 0.85);
  assert.deepEqual(AURORA_DARK_OPTIONS.colors, ['#2B5B9E', '#4B6CB7', '#3A7CA5', '#5C548E']);
});

test('Aurora: mountAurora safely handles missing DOM / SSR environment', () => {
  const instance = mountAurora(null);
  assert.ok(instance, 'Must return instance object');
  assert.equal(typeof instance.update, 'function');
  assert.equal(typeof instance.destroy, 'function');

  assert.doesNotThrow(() => {
    instance.update(AURORA_LIGHT_OPTIONS);
    instance.destroy();
  });
});
