import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Task 1: index.html has required semantic elements and structure', () => {
  const indexPath = path.join(ROOT, 'index.html');
  assert.ok(fs.existsSync(indexPath), 'index.html must exist');

  const content = fs.readFileSync(indexPath, 'utf-8');
  assert.match(content, /id="sidebar"/, 'must contain #sidebar');
  assert.match(content, /id="app-header"/, 'must contain #app-header');
  assert.match(content, /id="chat-canvas"/, 'must contain #chat-canvas');
  assert.match(content, /id="chat-composer"/, 'must contain #chat-composer');
  assert.match(content, /id="parameters-drawer"/, 'must contain #parameters-drawer');
  assert.match(content, /id="onboarding-modal"/, 'must contain #onboarding-modal');
  assert.match(content, /id="settings-modal"/, 'must contain #settings-modal');
  assert.match(content, /href="https:\/\/github\.com\/ayujha-dev"/, 'must contain link to github.com/ayujha-dev');
  assert.match(content, /made by ayujha-dev/, 'must contain "made by ayujha-dev" branding');
  assert.match(content, /target="_blank"/, 'branding link must open in new tab');
  assert.match(content, /type="module"\s+src="js\/app\.js"/, 'must load js/app.js as ES module');
});

test('Task 1: css/main.css contains Gemini palette custom properties and branding styles', () => {
  const cssPath = path.join(ROOT, 'css', 'main.css');
  assert.ok(fs.existsSync(cssPath), 'css/main.css must exist');

  const css = fs.readFileSync(cssPath, 'utf-8');
  assert.match(css, /--surface-bg:/, 'must define --surface-bg');
  assert.match(css, /--surface-panel:/, 'must define --surface-panel');
  assert.match(css, /--surface-border:/, 'must define --surface-border');
  assert.match(css, /--text-primary:/, 'must define --text-primary');
  assert.match(css, /\.brand-link/, 'must style .brand-link');
});

test('Task 1: assets/icons/icons.svg exists and defines SVG symbols', () => {
  const iconPath = path.join(ROOT, 'assets', 'icons', 'icons.svg');
  assert.ok(fs.existsSync(iconPath), 'assets/icons/icons.svg must exist');

  const svg = fs.readFileSync(iconPath, 'utf-8');
  assert.match(svg, /<svg xmlns=/, 'must be valid svg wrapper');
  assert.match(svg, /id="icon-send"/, 'must contain send icon symbol');
  assert.match(svg, /id="icon-gear"/, 'must contain gear icon symbol');
});
