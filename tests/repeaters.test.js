import test from 'node:test';
import assert from 'node:assert/strict';

import { REPEATER_MODELS, getRepeaterModel, resolveRepeater } from '../src/repeaters.js';

test('catalog contains unique sourced preset models', () => {
  assert.deepEqual(REPEATER_MODELS.map(({ id }) => id), [
    'tactech-mavic',
    'vishchun-5-8',
    'urs-ar-v2',
    'toro-puta-maxi',
    'brave-skybridge',
    'brave-urs-ar-c-v1',
    'brave-nebokrai-49-61',
    'brave-4pm-33-58',
    'brave-4pm-58-67',
    'brave-4pm-58-45',
    'brave-vishchun-p',
    'brave-nebokrai-33-58',
    'brave-fpv-matrice-30',
    'urs-ar-v2-30-49-12',
    'urs-ar-v2-30-49-33',
    'urs-ar-v2-49-58-12',
    'urs-ar-v2-49-58-33',
    'urs-ar-v2-61-72-12',
    'urs-ar-v2-61-72-33',
    'urs-ar-v2-33-12'
  ]);
  assert.equal(new Set(REPEATER_MODELS.map(({ id }) => id)).size, 20);
  assert.ok(REPEATER_MODELS.every(({ sourceUrl }) => sourceUrl.startsWith('https://')));
});

test('catalog labels omit marketplace prefixes and every model has usable video data', () => {
  assert.ok(REPEATER_MODELS.every(({ name }) => !/^BRAVE1\s*[—-]/i.test(name)));
  assert.ok(REPEATER_MODELS.every(({ channels }) => channels.videoRx.length > 0));
  assert.ok(REPEATER_MODELS.every(({ channels }) => channels.videoTx.length > 0));
});

test('every model provides a control frequency or an explicit control note', () => {
  assert.ok(REPEATER_MODELS.every(({ channels, channelNotes }) =>
    channels.controlTx.length > 0 || channelNotes?.controlTx
  ));
});

test('Vishchun-P uses the published 4990–5945 MHz receiver range', () => {
  const model = getRepeaterModel('brave-vishchun-p');

  assert.equal(model.channels.videoRx[0].start, 4990);
  assert.equal(model.channels.videoRx[0].end, 5945);
  assert.deepEqual(model.channels.videoTx.map(({ start }) => start), [1200, 1300]);
});

test('Matrice 30 repeater exposes its published video and control choices', () => {
  const model = getRepeaterModel('brave-fpv-matrice-30');

  assert.deepEqual(model.channels.videoRx.map(({ start }) => start), [1200, 3300, 5800, 6000]);
  assert.equal(model.channels.controlTx[0].start, 100);
  assert.equal(model.channels.controlTx[0].end, 2600);
});

test('Nebokrai exposes the exact RX range printed in its Brave1 title', () => {
  const model = getRepeaterModel('brave-nebokrai-49-61');

  assert.deepEqual(model.channels.videoRx, [{
    id: 'rx-4900-6100',
    label: '4.9–6.1 ГГц',
    start: 4900,
    end: 6100,
    precision: 'exact'
  }]);
  assert.deepEqual(model.channels.videoTx.map(({ start }) => start), [1300, 3300]);
});

test('SkyBridge keeps the documented conversion directions', () => {
  const model = getRepeaterModel('brave-skybridge');

  assert.deepEqual(model.channels.videoRx.map(({ start }) => start), [1200]);
  assert.deepEqual(model.channels.videoTx.map(({ start }) => start), [5800]);
  assert.deepEqual(model.channels.controlTx.map(({ start }) => start), [433]);
});

test('video-only model resolves without requesting an undocumented control frequency', () => {
  const resolved = resolveRepeater({
    modelId: 'brave-nebokrai-33-58',
    selections: { videoRx: 'rx-3300', videoTx: 'tx-5800', controlTx: null }
  });

  assert.equal(resolved.missing.some((item) => /керування/i.test(item)), false);
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
  assert.equal(resolved.missing.some((item) => /керування/i.test(item)), false);
  assert.match(resolved.missing.join(' '), /точна частота передавання відео/i);
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
