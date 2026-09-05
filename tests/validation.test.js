import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findDuplicateAssignment,
  validateCatalog,
  validateProfile,
  validateRange
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
