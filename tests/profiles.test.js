import test from 'node:test';
import assert from 'node:assert/strict';

import { FACTORY_PROFILE, cloneFactoryProfile } from '../src/profiles.js';

test('factory profile supplies the approved control ranges', () => {
  assert.deepEqual(FACTORY_PROFILE.control.lower, {
    min: 410,
    max: 485,
    start: 410,
    end: 485,
    polarization: 'H',
    hopsPerSecond: 30
  });
  assert.deepEqual(FACTORY_PROFILE.control.upper, {
    min: 820,
    max: 895,
    start: 820,
    end: 895,
    polarization: 'V',
    hopsPerSecond: 30
  });
});

test('factory profile supplies nine switch positions and eighteen alternatives', () => {
  assert.deepEqual(FACTORY_PROFILE.video.matrix, [
    [5180, 5240, 5300],
    [5520, 5580, 5640],
    [5700, 5765, 5825]
  ]);
  assert.equal(FACTORY_PROFILE.video.catalog.length, 18);
  assert.equal(new Set(FACTORY_PROFILE.video.catalog).size, 18);
});

test('factory profile starts with no repeater selected', () => {
  assert.equal(FACTORY_PROFILE.schemaVersion, 2);
  assert.deepEqual(FACTORY_PROFILE.repeater, {
    modelId: null,
    customName: '',
    selections: { videoRx: null, videoTx: null, controlTx: null },
    customRanges: []
  });
});

test('factory profile clone can be edited without mutating defaults', () => {
  const clone = cloneFactoryProfile();
  clone.control.lower.start = 420;
  clone.video.matrix[0][0] = 5200;

  assert.equal(FACTORY_PROFILE.control.lower.start, 410);
  assert.equal(FACTORY_PROFILE.video.matrix[0][0], 5180);
});
