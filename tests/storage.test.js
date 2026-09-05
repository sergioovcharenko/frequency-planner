import test from 'node:test';
import assert from 'node:assert/strict';

import { cloneFactoryProfile, FACTORY_PROFILE } from '../src/profiles.js';
import { createSettingsStore } from '../src/storage.js';

const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  };
};

test('empty storage loads an editable factory clone', () => {
  const store = createSettingsStore(memoryStorage(), FACTORY_PROFILE);
  const loaded = store.load();

  assert.deepEqual(loaded.profile, FACTORY_PROFILE);
  assert.notEqual(loaded.profile, FACTORY_PROFILE);
  assert.equal(loaded.notice, null);
});

test('valid settings survive save and reload', () => {
  const storage = memoryStorage();
  const store = createSettingsStore(storage, FACTORY_PROFILE);
  const changed = cloneFactoryProfile();
  changed.control.lower.start = 420;

  assert.deepEqual(store.save(changed), { ok: true, error: null });
  assert.equal(store.load().profile.control.lower.start, 420);
});

test('malformed or wrong-version data falls back to factory safely', () => {
  const malformed = memoryStorage();
  malformed.setItem('frequency-planner.settings.v1', '{bad json');
  const malformedResult = createSettingsStore(malformed, FACTORY_PROFILE).load();
  assert.equal(malformedResult.profile.control.lower.start, 410);
  assert.match(malformedResult.notice, /відновлено/i);

  const outdated = memoryStorage();
  outdated.setItem('frequency-planner.settings.v1', JSON.stringify({ schemaVersion: 99 }));
  const outdatedResult = createSettingsStore(outdated, FACTORY_PROFILE).load();
  assert.equal(outdatedResult.profile.control.upper.end, 895);
  assert.match(outdatedResult.notice, /відновлено/i);
});

test('invalid profile cannot be saved', () => {
  const store = createSettingsStore(memoryStorage(), FACTORY_PROFILE);
  const changed = cloneFactoryProfile();
  changed.control.lower.start = 409;

  const result = store.save(changed);
  assert.equal(result.ok, false);
  assert.match(result.error, /не збережено/i);
});

test('reset removes saved settings and returns factory values', () => {
  const storage = memoryStorage();
  const store = createSettingsStore(storage, FACTORY_PROFILE);
  const changed = cloneFactoryProfile();
  changed.control.upper.end = 880;
  store.save(changed);

  const reset = store.reset();
  assert.deepEqual(reset, FACTORY_PROFILE);
  assert.equal(store.load().profile.control.upper.end, 895);
});
