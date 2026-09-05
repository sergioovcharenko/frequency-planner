import { validateProfile } from './validation.js';

const STORAGE_KEY = 'frequency-planner.settings.v1';

const clone = (value) => structuredClone(value);

export const createSettingsStore = (storage, factoryProfile) => ({
  load() {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { profile: clone(factoryProfile), notice: null };

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
    return clone(factoryProfile);
  }
});
