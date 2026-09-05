import { FACTORY_PROFILE } from './profiles.js';
import { createSettingsStore } from './storage.js';
import { mountUI } from './ui.js';

const store = createSettingsStore(window.localStorage, FACTORY_PROFILE);
const { profile, notice } = store.load();

mountUI({ document, profile, store });

if (notice) {
  const element = document.querySelector('#notice');
  element.hidden = false;
  element.dataset.kind = 'info';
  element.textContent = notice;
}
