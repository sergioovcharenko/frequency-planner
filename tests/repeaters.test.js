import test from 'node:test';
import assert from 'node:assert/strict';

import { REPEATER_MODELS, getRepeaterModel, resolveRepeater } from '../src/repeaters.js';

test('catalog contains unique sourced preset models', () => {
  assert.deepEqual(REPEATER_MODELS.map(({ id }) => id), ['tactech-mavic', 'vishchun-5-8']);
  assert.equal(new Set(REPEATER_MODELS.map(({ id }) => id)).size, 2);
  assert.ok(REPEATER_MODELS.every(({ sourceUrl }) => sourceUrl.startsWith('https://')));
});

test('Vishchun exposes exact RX without treating it as TX', () => {
  const model = getRepeaterModel('vishchun-5-8');
  assert.deepEqual(model.channels.videoRx[0], {
    id: 'rx-4990-5945',
    label: '4990–5945 МГц',
    start: 4990,
    end: 5945,
    precision: 'exact'
  });
  assert.equal(model.channels.videoTx.some((channel) => channel.start === 4990), false);
});

test('resolver returns selected TX channels only as transmitters', () => {
  const resolved = resolveRepeater({
    modelId: 'vishchun-5-8',
    customName: '',
    selections: { videoRx: 'rx-4990-5945', videoTx: 'tx-1300', controlTx: null },
    customRanges: []
  });

  assert.equal(resolved.videoRx.start, 4990);
  assert.deepEqual(resolved.transmitters.map(({ start, end }) => [start, end]), [[1300, 1300]]);
  assert.match(resolved.missing.join(' '), /керування/i);
});

test('custom resolver never treats receive ranges as transmitters', () => {
  const resolved = resolveRepeater({
    modelId: 'custom',
    customName: 'Польовий',
    selections: {},
    customRanges: [
      { id: 'rx', direction: 'rx', purpose: 'video', start: 4900, end: 6000, label: 'RX відео' },
      { id: 'tx', direction: 'tx', purpose: 'video', start: 1300, end: 1300, label: 'TX земля' }
    ]
  });

  assert.equal(resolved.videoRx.start, 4900);
  assert.deepEqual(resolved.transmitters.map(({ start }) => start), [1300]);
});

test('nominal manufacturer bands remain explicitly incomplete', () => {
  const resolved = resolveRepeater({
    modelId: 'tactech-mavic',
    customName: '',
    selections: {
      videoRx: 'rx-5800',
      videoTx: 'tx-1200',
      controlTx: 'control-433-520'
    },
    customRanges: []
  });

  assert.match(resolved.missing.join(' '), /точні межі приймання відео/i);
  assert.match(resolved.missing.join(' '), /точна частота передавання відео/i);
});
