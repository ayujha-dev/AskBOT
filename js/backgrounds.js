/**
 * Background Manager: Dynamic WebGL2 & Canvas Background Switcher for AskBOT
 * Manages mounting, clean context destroying, theme synchronization,
 * and localStorage persistence across Antigravity (Default), Galaxy, Gemini Aurora, and None modes.
 */

import { mountGalaxy, DEFAULT_GALAXY_OPTIONS, GALAXY_LIGHT_OPTIONS, GALAXY_DARK_OPTIONS } from './galaxy.js';
import { mountAntigravity, DEFAULT_ANTIGRAVITY_COLORS } from './antigravity.js';
import { mountAurora, DEFAULT_AURORA_OPTIONS, AURORA_LIGHT_OPTIONS, AURORA_DARK_OPTIONS } from './aurora.js';

export const BACKGROUND_TYPES = {
  ANTIGRAVITY: 'antigravity',
  GALAXY: 'galaxy',
  AURORA: 'aurora',
  NONE: 'none'
};

export const STORAGE_KEY_BACKGROUND = 'askbot_background';

export class BackgroundManager {
  constructor(containerEl, initialTheme = 'dark') {
    this.container = containerEl || (typeof document !== 'undefined' ? document.getElementById('antigravity-bg') : null);
    this.theme = initialTheme;
    this.activeInstance = null;
    this.currentMode = this.getSavedMode() || BACKGROUND_TYPES.ANTIGRAVITY;
  }

  getSavedMode() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(STORAGE_KEY_BACKGROUND) || BACKGROUND_TYPES.ANTIGRAVITY;
      }
    } catch (_) {}
    return BACKGROUND_TYPES.ANTIGRAVITY;
  }

  saveMode(mode) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_BACKGROUND, mode);
      }
    } catch (_) {}
  }

  init() {
    this.mount(this.currentMode);
  }

  mount(mode) {
    // 1. Destroy active instance if one is already mounted (clean context release)
    if (this.activeInstance) {
      try {
        this.activeInstance.destroy();
      } catch (err) {
        console.warn('[BackgroundManager] Error destroying active background:', err);
      }
      this.activeInstance = null;
    }

    // 2. Clear canvas/children from container to avoid context reuse collision
    if (this.container) {
      this.container.innerHTML = '';
    }

    const isLight = this.theme === 'light';
    this.currentMode = mode;
    this.saveMode(mode);

    if (mode === BACKGROUND_TYPES.ANTIGRAVITY) {
      if (!this.container) return;
      this.activeInstance = mountAntigravity(this.container, {
        colors: DEFAULT_ANTIGRAVITY_COLORS,
        count: 1500,
        magnetRadius: 9,
        ringRadius: 7,
        particleSize: 0.9,
        ambient: 0.18,
        autoAnimate: true,
        lightMode: isLight,
        opacity: isLight ? 0.35 : 0.42
      });
    } else if (mode === BACKGROUND_TYPES.GALAXY) {
      if (!this.container) return;
      const opts = {
        ...DEFAULT_GALAXY_OPTIONS,
        ...(isLight ? GALAXY_LIGHT_OPTIONS : GALAXY_DARK_OPTIONS)
      };
      this.activeInstance = mountGalaxy(this.container, opts);
    } else if (mode === BACKGROUND_TYPES.AURORA) {
      if (!this.container) return;
      const opts = {
        ...DEFAULT_AURORA_OPTIONS,
        ...(isLight ? AURORA_LIGHT_OPTIONS : AURORA_DARK_OPTIONS)
      };
      this.activeInstance = mountAurora(this.container, opts);
    } else {
      // mode === 'none' -> Minimal static mode without WebGL/canvas overhead
      this.activeInstance = null;
    }
  }

  switchBackground(newMode) {
    if (newMode === this.currentMode && this.activeInstance) {
      return;
    }
    this.mount(newMode);
  }

  handleThemeChange(theme) {
    this.theme = theme;
    const isLight = theme === 'light';

    if (this.currentMode === BACKGROUND_TYPES.ANTIGRAVITY && this.activeInstance) {
      this.activeInstance.update({
        lightMode: isLight,
        opacity: isLight ? 0.35 : 0.42
      });
    } else if (this.currentMode === BACKGROUND_TYPES.GALAXY && this.activeInstance) {
      if (isLight) {
        this.activeInstance.update(GALAXY_LIGHT_OPTIONS);
      } else {
        this.activeInstance.update(GALAXY_DARK_OPTIONS);
      }
    } else if (this.currentMode === BACKGROUND_TYPES.AURORA && this.activeInstance) {
      if (isLight) {
        this.activeInstance.update(AURORA_LIGHT_OPTIONS);
      } else {
        this.activeInstance.update(AURORA_DARK_OPTIONS);
      }
    }
  }

  destroy() {
    if (this.activeInstance) {
      try {
        this.activeInstance.destroy();
      } catch (_) {}
      this.activeInstance = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
