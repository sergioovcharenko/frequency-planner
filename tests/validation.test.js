import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findDuplicateAssignment,
  validateCatalog,
  validateProfile,
  validateRange,
  validateRepeater
} from '../src/validation.js';
import { cloneFactoryProfile } from '../src/profiles.js';

test('range accepts values inside its approved inclusive limits', () => {
  assert.deepEqual(validateRange({ min: 410, max: 485, start: 420, end: 470 }), []);
  assert.deepEqual(validateRange({ min: 410, max: 485, start: 410, end: 485 }), []);
});

test('range rejects values outside approved limits', () => {
  assert.equal(
    validateRange({ min: 410, max: 485, start: 409, end: 470 })[0].code,
    'OUT_OF_BOUNDS'
  );
  assert.equal(
    validateRange({ min: 410, max: 485, start: 420, end: 486 })[0].code,
    'OUT_OF_BOUNDS'
  );
});

test('range rejects a start that is not lower than its end', () => {
  assert.equal(
    validateRange({ min: 410, max: 485, start: 470, end: 420 })[0].code,
    'INVALID_ORDER'
  );
  assert.equal(
    validateRange({ min: 410, max: 485, start: 450, end: 450 })[0].code,
    'INVALID_ORDER'
  );
});

test('duplicate detector identifies the frequency and original SA group', () => {
  const matrix = [
    [5180, 5240, 5300],
    [5520, 5580, 5640],
    [5700, 5580, 5825]
  ];

  assert.deepEqual(findDuplicateAssignment(matrix), {
    frequency: 5580,
    firstGroup: '5.5',
    secondGroup: '5.8'
  });
});

test('catalog requires exactly eighteen unique finite frequencies', () => {
  const valid = Array.from({ length: 18 }, (_, index) => 5000 + index * 20);
  assert.deepEqual(validateCatalog(valid), []);
  assert.equal(validateCatalog(valid.slice(0, 17))[0].code, 'INVALID_CATALOG');
  assert.equal(validateCatalog([...valid.slice(0, 17), valid[0]])[0].code, 'INVALID_CATALOG');
  assert.equal(validateCatalog([...valid.slice(0, 17), Number.NaN])[0].code, 'INVALID_CATALOG');
});

test('profile validation returns duplicate and range errors without throwing', () => {
  const profile = cloneFactoryProfile();
  profile.control.lower.start = 409;
  profile.video.matrix[2][1] = 5580;

  const codes = validateProfile(profile).map((error) => error.code);
  assert.ok(codes.includes('OUT_OF_BOUNDS'));
  assert.ok(codes.includes('DUPLICATE_VIDEO'));
});

test('custom repeater accepts a single frequency and a proper range', () => {
  const repeater = {
    modelId: 'custom',
    customName: 'Польовий',
    selections: {},
    customRanges: [
      { id: 'a', direction: 'rx', purpose: 'video', start: 4900, end: 6000, label: 'RX' },
      { id: 'b', direction: 'tx', purpose: 'video', start: 1300, end: 1300, label: 'TX' }
    ]
  };
  assert.deepEqual(validateRepeater(repeater), []);
});

test('custom repeater rejects reversed ranges and a missing name', () => {
  const errors = validateRepeater({
    modelId: 'custom',
    customName: '',
    selections: {},
    customRanges: [
      { id: 'bad', direction: 'tx', purpose: 'video', start: 900, end: 800, label: '' }
    ]
  });
  assert.ok(errors.some(({ code }) => code === 'INVALID_REPEATER_RANGE'));
  assert.ok(errors.some(({ code }) => code === 'MISSING_REPEATER_NAME'));
  assert.ok(errors.some(({ code }) => code === 'MISSING_VIDEO_RX'));
});

test('custom repeater rejects duplicate ids and invalid channel types', () => {
  const errors = validateRepeater({
    modelId: 'custom',
    customName: 'Польовий',
    selections: {},
    customRanges: [
      { id: 'same', direction: 'rx', purpose: 'video', start: 4900, end: 6000, label: 'RX' },
      { id: 'same', direction: 'sideways', purpose: 'audio', start: -1, end: Number.NaN, label: '' }
    ]
  });
  const codes = errors.map(({ code }) => code);
  assert.ok(codes.includes('DUPLICATE_REPEATER_RANGE'));
  assert.ok(codes.includes('INVALID_REPEATER_CHANNEL'));
  assert.ok(codes.includes('INVALID_REPEATER_RANGE'));
});

test('current profile requires repeater settings structure', () => {
  const profile = cloneFactoryProfile();
  delete profile.repeater;
  assert.ok(validateProfile(profile).some(({ code }) => code === 'INVALID_REPEATER'));
});
