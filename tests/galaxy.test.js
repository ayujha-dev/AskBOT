import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mountGalaxy,
  DEFAULT_GALAXY_OPTIONS,
  GALAXY_LIGHT_OPTIONS,
  GALAXY_DARK_OPTIONS,
  parseColor,
  clamp,
  keyOf
} from '../js/galaxy.js';

test('Galaxy: Module exports functions, constants, and math utilities', () => {
  assert.equal(typeof mountGalaxy, 'function', 'mountGalaxy must be an exported function');
  assert.ok(DEFAULT_GALAXY_OPTIONS, 'DEFAULT_GALAXY_OPTIONS must be exported');
  assert.equal(DEFAULT_GALAXY_OPTIONS.density, 1.35);
  assert.equal(DEFAULT_GALAXY_OPTIONS.glowIntensity, 0.28);
  assert.equal(DEFAULT_GALAXY_OPTIONS.flareIntensity, 1);
  assert.equal(DEFAULT_GALAXY_OPTIONS.starSpeed, 0.85);
  assert.equal(DEFAULT_GALAXY_OPTIONS.mouseRepulsion, true);
  assert.equal(DEFAULT_GALAXY_OPTIONS.clickWarp, false);
  assert.deepEqual(DEFAULT_GALAXY_OPTIONS.starColors, ['#ffffff', '#ffd9a3', '#a8c8ff']);
  assert.equal(DEFAULT_GALAXY_OPTIONS.starSize, 1.55);
  assert.equal(DEFAULT_GALAXY_OPTIONS.twinkleIntensity, 0.27);
  assert.equal(DEFAULT_GALAXY_OPTIONS.speed, 0.4);
  assert.equal(DEFAULT_GALAXY_OPTIONS.rotationSpeed, 0.06);
  assert.equal(DEFAULT_GALAXY_OPTIONS.layers, 3);
  assert.equal(DEFAULT_GALAXY_OPTIONS.repulsionStrength, 5);
  assert.equal(DEFAULT_GALAXY_OPTIONS.transparent, true);
});

test('Galaxy: Light mode & dark mode options match specifications', () => {
  assert.equal(GALAXY_LIGHT_OPTIONS.lightMode, true);
  assert.equal(GALAXY_LIGHT_OPTIONS.transparent, true);
  assert.equal(GALAXY_LIGHT_OPTIONS.backgroundColor, '#F3F5F9');
  assert.equal(GALAXY_LIGHT_OPTIONS.opacity, 0.55);
  assert.deepEqual(GALAXY_LIGHT_OPTIONS.starColors, ['#334155', '#64748b', '#3b82f6']);

  assert.equal(GALAXY_DARK_OPTIONS.lightMode, false);
  assert.equal(GALAXY_DARK_OPTIONS.transparent, true);
  assert.equal(GALAXY_DARK_OPTIONS.backgroundColor, '#0E1117');
  assert.equal(GALAXY_DARK_OPTIONS.opacity, 0.9);
  assert.deepEqual(GALAXY_DARK_OPTIONS.starColors, ['#ffffff', '#ffd9a3', '#a8c8ff']);
});

test('Galaxy: Math and color parsing utilities function correctly', () => {
  assert.equal(clamp(1.5, 0, 1), 1);
  assert.equal(clamp(-0.5, 0, 1), 0);
  assert.equal(clamp(0.5, 0, 1), 0.5);

  assert.equal(keyOf(false, false, false), 0);
  assert.equal(keyOf(false, false, true), 1);
  assert.equal(keyOf(false, true, false), 2);
  assert.equal(keyOf(true, false, false), 4);
  assert.equal(keyOf(true, true, true), 7);

  const white = parseColor('#ffffff');
  assert.deepEqual(white, [1, 1, 1]);

  const ink = parseColor('#334155');
  assert.ok(Array.isArray(ink) && ink.length === 3);
  assert.ok(Math.abs(ink[0] - 51 / 255) < 0.01);
  assert.ok(Math.abs(ink[1] - 65 / 255) < 0.01);
  assert.ok(Math.abs(ink[2] - 85 / 255) < 0.01);

  const fallback = parseColor(null, [0.5, 0.5, 0.5]);
  assert.deepEqual(fallback, [0.5, 0.5, 0.5]);
});

test('Galaxy: mountGalaxy safely handles missing DOM / SSR environment', () => {
  const instance = mountGalaxy(null);
  assert.ok(instance, 'Must return instance object');
  assert.equal(typeof instance.update, 'function');
  assert.equal(typeof instance.destroy, 'function');

  assert.doesNotThrow(() => {
    instance.update(GALAXY_LIGHT_OPTIONS);
    instance.destroy();
  });
});
