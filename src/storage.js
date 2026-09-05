import { validateProfile } from './validation.js';

const STORAGE_KEY = 'frequency-planner.settings.v2';
const LEGACY_STORAGE_KEY = 'frequency-planner.settings.v1';

const clone = (value) => structuredClone(value);

export const createSettingsStore = (storage, factoryProfile) => ({
  load() {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) {
      const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw === null) return { profile: clone(factoryProfile), notice: null };

      try {
        const legacy = JSON.parse(legacyRaw);
        if (legacy.schemaVersion !== 1 || !legacy.control || !legacy.video) throw new Error('invalid legacy profile');
        const profile = clone(factoryProfile);
        profile.control = clone(legacy.control);
        profile.video = clone(legacy.video);
        if (validateProfile(profile).length) throw new Error('invalid migrated profile');
        storage.setItem(STORAGE_KEY, JSON.stringify(profile));
        return { profile, notice: 'Локальні налаштування оновлено до нової версії.' };
      } catch {
        return {
          profile: clone(factoryProfile),
          notice: 'Некоректні локальні налаштування відновлено до штатних.'
        };
      }
    }

    try {
      const profile = JSON.parse(raw);
      if (profile.schemaVersion !== factoryProfile.schemaVersion || validateProfile(profile).length) {
        throw new Error('invalid profile');
      }
      return { profile, notice: null };
    } catch {
      return {
        profile: clone(factoryProfile),
        notice: 'Некоректні локальні налаштування відновлено до штатних.'
      };
    }
  },

  save(profile) {
    if (profile.schemaVersion !== factoryProfile.schemaVersion || validateProfile(profile).length) {
      return { ok: false, error: 'Налаштування не збережено: виправте помилки.' };
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return { ok: true, error: null };
    } catch {
      return { ok: false, error: 'Налаштування не збережено: сховище браузера недоступне.' };
    }
  },

  reset() {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(LEGACY_STORAGE_KEY);
    return clone(factoryProfile);
  }
});
