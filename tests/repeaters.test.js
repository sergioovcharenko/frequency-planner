import test from 'node:test';
import assert from 'node:assert/strict';

import { REPEATER_MODELS, getRepeaterModel, resolveRepeater } from '../src/repeaters.js';

test('catalog contains unique sourced preset models', () => {
  assert.deepEqual(REPEATER_MODELS.map(({ id }) => id), [
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
    'brave-rz-m'
  ]);
  assert.equal(new Set(REPEATER_MODELS.map(({ id }) => id)).size, 24);
  assert.ok(REPEATER_MODELS.every(({ sourceUrl }) => sourceUrl.startsWith('https://')));
});

test('catalog contains twenty Brave1 models linked to their product cards', () => {
  const braveModels = REPEATER_MODELS.filter(({ sourceUrl }) =>
    sourceUrl.startsWith('https://market-brave1.delta.mil.gov.ua/retransliatory/')
  );

  assert.equal(braveModels.length, 20);
  assert.ok(braveModels.every(({ sourceUrl }) => /\/retransliatory\/\d+\/$/.test(sourceUrl)));
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
