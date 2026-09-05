import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { cloneFactoryProfile } from '../src/profiles.js';
import { buildRepeaterViewModel, repeaterModelOptions } from '../src/ui.js';

test('repeater model options include presets and custom mode', () => {
  assert.deepEqual(repeaterModelOptions().map(({ value }) => value), [
    '',
    'tactech-mavic',
    'vishchun-5-8',
    'urs-ar-v2',
    'toro-puta-maxi',
    'brave-urs-ar-v2-61-72',
    'brave-eho-lite-75',
    'brave-skybridge',
    'brave-urs-ar-c-v1',
    'brave-echo',
    'brave-donbas',
    'brave-nebokrai-49-61',
    'brave-4pm-33-58',
    'brave-4pm-58-67',
    'brave-4pm-58-45',
    'brave-k4rm4',
    'brave-sine-link-video',
    'brave-lanker',
    'brave-air-repeater',
    'brave-nebokrai-digital',
    'brave-vishchun-p',
    'brave-nebokrai-33-58',
    'brave-fpv-matrice-30',
    'brave-phantom-18',
    'brave-rz-m',
    'custom'
  ]);
});

test('preset view model exposes source, selections, and locked state', () => {
  const profile = cloneFactoryProfile();
  profile.repeater.modelId = 'vishchun-5-8';
  const view = buildRepeaterViewModel(profile.repeater, false);
  assert.equal(view.sourceUrl, 'https://www.blue-bird.tech/en/products/wireless-retranslator-blue-bird-repeater/');
  assert.equal(view.disabled, true);
  assert.equal(view.fields.videoRx[0].id, 'rx-4990-5945');
});

test('custom view model exposes editable normalized rows', () => {
  const config = {
    modelId: 'custom',
    customName: 'Польовий',
    selections: {},
    customRanges: [
      { id: 'r1', direction: 'rx', purpose: 'video', start: 4900, end: 6000, label: 'RX' }
    ]
  };
  const view = buildRepeaterViewModel(config, true);
  assert.equal(view.custom, true);
  assert.equal(view.disabled, false);
  assert.deepEqual(view.customRanges[0], config.customRanges[0]);
});

test('unselected repeater view explains missing model data', () => {
  const view = buildRepeaterViewModel(cloneFactoryProfile().repeater, false);
  assert.equal(view.sourceUrl, '');
  assert.match(view.missing.join(' '), /модель ретранслятора/i);
});

test('page contains the repeater editor controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of [
    'edit-repeater-button',
    'repeater-model',
    'repeater-source',
    'repeater-status',
    'repeater-fields',
    'custom-range-list',
    'add-custom-range'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});
