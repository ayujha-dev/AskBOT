import test from 'node:test';
import assert from 'node:assert/strict';

test('Task 8: SidebarComponent title generation cleans and summarizes prompts', async () => {
  const { SidebarComponent } = await import('../js/ui/components/sidebar.js');

  const title1 = SidebarComponent.generateTitle('How can I implement a binary search tree in Python?');
  assert.ok(title1.length <= 40, 'Title should be concise (<= 40 chars)');
  assert.ok(title1.includes('Binary') || title1.includes('binary'), 'Retains core subject');

  const title2 = SidebarComponent.generateTitle('Write a quick CSS grid layout');
  assert.ok(title2.length > 0 && title2.length <= 40);
});

test('Task 8: SettingsModal provider registry covers all 5 frontier providers and privacy text', async () => {
  const { SettingsModal } = await import('../js/ui/components/settings-modal.js');

  assert.ok(SettingsModal.PROVIDERS_CONFIG);
  const providerIds = Object.keys(SettingsModal.PROVIDERS_CONFIG);
  assert.ok(providerIds.includes('groq'));
  assert.ok(providerIds.includes('xai'));
  assert.ok(providerIds.includes('openai'));
  assert.ok(providerIds.includes('gemini'));
  assert.ok(providerIds.includes('claude'));

  assert.ok(SettingsModal.PRIVACY_NOTICE.includes('localStorage'));
});
