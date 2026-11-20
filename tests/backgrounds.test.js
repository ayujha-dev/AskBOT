import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BackgroundManager,
  BACKGROUND_TYPES,
  STORAGE_KEY_BACKGROUND
} from '../js/backgrounds.js';

// Mock localStorage for Node environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear()
  };
}

test('BackgroundManager: Defines background types and default selection', () => {
  assert.equal(BACKGROUND_TYPES.ANTIGRAVITY, 'antigravity');
  assert.equal(BACKGROUND_TYPES.GALAXY, 'galaxy');
  assert.equal(BACKGROUND_TYPES.AURORA, 'aurora');
  assert.equal(BACKGROUND_TYPES.NONE, 'none');

  globalThis.localStorage.removeItem(STORAGE_KEY_BACKGROUND);
  const bm = new BackgroundManager(null, 'dark');
  assert.equal(bm.getSavedMode(), 'antigravity', 'Default background must be antigravity');
  assert.equal(bm.currentMode, 'antigravity');
});

test('BackgroundManager: Switching modes persists to localStorage and manages lifecycle', () => {
  const bm = new BackgroundManager(null, 'dark');

  // Track destroy calls
  let destroyCalled = false;
  bm.activeInstance = {
    update: () => {},
    destroy: () => { destroyCalled = true; }
  };

  bm.switchBackground('galaxy');
  assert.equal(destroyCalled, true, 'Active instance must be destroyed on mode switch');
  assert.equal(bm.currentMode, 'galaxy');
  assert.equal(globalThis.localStorage.getItem(STORAGE_KEY_BACKGROUND), 'galaxy');

  // Switch to aurora
  let galaxyDestroyed = false;
  bm.activeInstance = {
    update: () => {},
    destroy: () => { galaxyDestroyed = true; }
  };

  bm.switchBackground('aurora');
  assert.equal(galaxyDestroyed, true, 'Galaxy instance must be destroyed when switching to aurora');
  assert.equal(bm.currentMode, 'aurora');
  assert.equal(globalThis.localStorage.getItem(STORAGE_KEY_BACKGROUND), 'aurora');

  // Switch to none
  let auroraDestroyed = false;
  bm.activeInstance = {
    update: () => {},
    destroy: () => { auroraDestroyed = true; }
  };

  bm.switchBackground('none');
  assert.equal(auroraDestroyed, true);
  assert.equal(bm.currentMode, 'none');
  assert.equal(bm.activeInstance, null);
  assert.equal(globalThis.localStorage.getItem(STORAGE_KEY_BACKGROUND), 'none');
});

test('BackgroundManager: Handles theme change updates safely', () => {
  const bm = new BackgroundManager(null, 'dark');
  let lastUpdate = null;
  bm.activeInstance = {
    update: (opts) => { lastUpdate = opts; },
    destroy: () => {}
  };

  // When mode is antigravity
  bm.currentMode = 'antigravity';
  bm.handleThemeChange('light');
  assert.equal(lastUpdate.lightMode, true);
  assert.equal(lastUpdate.opacity, 0.35);

  bm.handleThemeChange('dark');
  assert.equal(lastUpdate.lightMode, false);
  assert.equal(lastUpdate.opacity, 0.42);

  // When mode is galaxy
  bm.currentMode = 'galaxy';
  bm.handleThemeChange('light');
  assert.equal(lastUpdate.lightMode, true);
  assert.equal(lastUpdate.opacity, 0.55);
  assert.deepEqual(lastUpdate.starColors, ['#334155', '#64748b', '#3b82f6']);

  bm.handleThemeChange('dark');
  assert.equal(lastUpdate.lightMode, false);
  assert.equal(lastUpdate.opacity, 0.9);
  assert.deepEqual(lastUpdate.starColors, ['#ffffff', '#ffd9a3', '#a8c8ff']);

  // When mode is aurora
  bm.currentMode = 'aurora';
  bm.handleThemeChange('light');
  assert.equal(lastUpdate.lightMode, true);
  assert.equal(lastUpdate.opacity, 0.42);

  bm.handleThemeChange('dark');
  assert.equal(lastUpdate.lightMode, false);
  assert.equal(lastUpdate.opacity, 0.85);
  assert.deepEqual(lastUpdate.colors, ['#2B5B9E', '#4B6CB7', '#3A7CA5', '#5C548E']);
});
