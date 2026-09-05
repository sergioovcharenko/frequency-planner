# Repeater Model Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add model-based repeater selection, manual repeater ranges, RX compatibility checks, and TX interference analysis to Frequency Planner.

**Architecture:** Keep manufacturer data in a focused immutable catalog module. Resolve the selected preset or custom configuration into one normalized repeater object, then pass its RX and TX channels into pure analysis functions. Extend the existing local profile and UI state without coupling DOM rendering to manufacturer data.

**Tech Stack:** Static HTML/CSS, browser-native ES modules, Node.js built-in test runner, localStorage, GitHub Actions and GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-05-repeater-models-design.md`

## Global Constraints

- RX channels describe compatibility and must never be treated as emitting interference.
- Only TX channels enter occupied-range and harmonic calculations.
- Missing manufacturer limits produce `unknown`/«Потрібне уточнення», never `good`/«Підходить».
- Preserve the existing 10 MHz danger and 11–27 MHz caution thresholds.
- Preserve existing local profiles through an explicit schema-v1-to-v2 migration.
- Keep the site dependency-free and deployable as static files on the existing GitHub Pages URL.
- Manufacturer facts must retain their source URL in the catalog and the UI.

---

### Task 1: Repeater catalog and normalized resolver

**Files:**
- Create: `src/repeaters.js`
- Create: `tests/repeaters.test.js`
- Modify: `src/profiles.js`
- Test: `tests/profiles.test.js`

**Interfaces:**
- Produces: `REPEATER_MODELS: ReadonlyArray<RepeaterModel>`.
- Produces: `getRepeaterModel(modelId: string): RepeaterModel | null`.
- Produces: `resolveRepeater(config: RepeaterConfig): ResolvedRepeater`.
- Extends: `FACTORY_PROFILE.repeater` and changes `schemaVersion` from `1` to `2`.

- [ ] **Step 1: Write failing catalog tests**

```js
import { REPEATER_MODELS, getRepeaterModel, resolveRepeater } from '../src/repeaters.js';

test('catalog contains unique sourced preset models', () => {
  assert.deepEqual(REPEATER_MODELS.map(({ id }) => id), ['tactech-mavic', 'vishchun-5-8']);
  assert.equal(new Set(REPEATER_MODELS.map(({ id }) => id)).size, 2);
  assert.ok(REPEATER_MODELS.every(({ sourceUrl }) => sourceUrl.startsWith('https://')));
});

test('Vishchun exposes exact RX without treating it as TX', () => {
  const model = getRepeaterModel('vishchun-5-8');
  assert.deepEqual(model.channels.videoRx[0], { id: 'rx-4990-5945', label: '4990–5945 МГц', start: 4990, end: 5945, precision: 'exact' });
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
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/repeaters.test.js tests/profiles.test.js`

Expected: FAIL because `src/repeaters.js` and `FACTORY_PROFILE.repeater` do not exist.

- [ ] **Step 3: Add the immutable catalog and resolver**

Create `src/repeaters.js` with this public shape:

```js
export const REPEATER_MODELS = deepFreeze([
  {
    id: 'tactech-mavic',
    name: 'Tactical Technology — Repeater on Mavic',
    sourceUrl: 'https://www.tactech.world/en/products/communication-and-control/repeater',
    channels: {
      controlTx: [range('control-433-520', '433–520 МГц', 433, 520), range('control-720-1020', '720–1020 МГц', 720, 1020), range('control-2100-2700', '2100–2700 МГц', 2100, 2700)],
      videoRx: [nominal('rx-5800', '5.8 ГГц', 5800), nominal('rx-6500', '6.5 ГГц', 6500), nominal('rx-7500', '7.5 ГГц', 7500)],
      videoTx: [nominal('tx-1200', '1.2 ГГц', 1200), nominal('tx-3300', '3.3 ГГц', 3300)]
    }
  },
  {
    id: 'vishchun-5-8',
    name: 'BlueBird Tech — Віщун-5.8',
    sourceUrl: 'https://www.blue-bird.tech/en/products/wireless-retranslator-blue-bird-repeater/',
    channels: {
      controlTx: [],
      videoRx: [range('rx-4990-5945', '4990–5945 МГц', 4990, 5945)],
      videoTx: [nominal('tx-1200', '1.2 ГГц', 1200), nominal('tx-1300', '1.3 ГГц', 1300)]
    }
  }
]);
```

Use `precision: 'exact'` for explicit numeric bounds and `precision: 'nominal'` when the source gives only a band name. `resolveRepeater()` must return `{ id, name, sourceUrl, videoRx, transmitters, missing }`; custom entries with `direction: 'tx'` enter `transmitters`, while custom RX entries never do.

- [ ] **Step 4: Extend the factory profile**

Change `schemaVersion` to `2` and add:

```js
repeater: {
  modelId: null,
  customName: '',
  selections: { videoRx: null, videoTx: null, controlTx: null },
  customRanges: []
}
```

Add profile assertions for the exact factory repeater object.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/repeaters.test.js tests/profiles.test.js`

Expected: all catalog, resolver, and profile tests PASS.

- [ ] **Step 6: Commit the catalog**

```bash
git add src/repeaters.js src/profiles.js tests/repeaters.test.js tests/profiles.test.js
git commit -m "feat: add repeater model catalog"
```

---

### Task 2: RX compatibility and TX-only interference analysis

**Files:**
- Modify: `src/analysis.js`
- Modify: `tests/analysis.test.js`

**Interfaces:**
- Consumes: `resolveRepeater(config)` from `src/repeaters.js`.
- Produces: `analyzeVideoCompatibility(frequency: number, rx: RadioChannel | null): CompatibilityResult`.
- Changes: `analyzeMatrix(profile, resolvedRepeater)` to merge compatibility and interference results.

- [ ] **Step 1: Add failing RX/TX separation tests**

```js
test('exact RX range marks an in-range video channel compatible', () => {
  assert.deepEqual(analyzeVideoCompatibility(5825, { start: 4990, end: 5945, precision: 'exact' }), {
    level: 'good', label: 'Сумісний із RX', reason: '5825 МГц входить у діапазон приймання 4990–5945 МГц.'
  });
});

test('nominal RX needs clarification instead of reporting safe', () => {
  const result = analyzeVideoCompatibility(5825, { start: 5800, end: 5800, precision: 'nominal', label: '5.8 ГГц' });
  assert.equal(result.level, 'unknown');
  assert.equal(result.label, 'Потрібне уточнення');
});

test('RX range does not create direct interference', () => {
  const profile = cloneFactoryProfile();
  const results = analyzeMatrix(profile, {
    videoRx: { start: 4990, end: 5945, precision: 'exact' },
    transmitters: [],
    missing: []
  });
  assert.notEqual(results.find(({ frequency }) => frequency === 5580).level, 'danger');
});

test('selected repeater TX participates in conflict analysis', () => {
  const profile = cloneFactoryProfile();
  const results = analyzeMatrix(profile, {
    videoRx: { start: 4990, end: 5945, precision: 'exact' },
    transmitters: [{ start: 5575, end: 5585, name: 'Передавання ретранслятора' }],
    missing: []
  });
  assert.equal(results.find(({ frequency }) => frequency === 5580).level, 'danger');
});
```

- [ ] **Step 2: Run the analysis tests and verify RED**

Run: `node --test tests/analysis.test.js`

Expected: FAIL because compatibility analysis and normalized repeater handling are absent.

- [ ] **Step 3: Implement compatibility and result merging**

Add `analyzeVideoCompatibility()`. Exact RX uses numeric containment. Nominal RX returns `{ level: 'unknown', label: 'Потрібне уточнення' }`. Missing RX returns `unknown` and names the missing input.

Refactor `analyzeMatrix()` so that:

```js
const interference = analyzeFrequency(frequency, {
  occupiedRanges: resolvedRepeater.transmitters ?? [],
  controlRanges
});
const compatibility = analyzeVideoCompatibility(frequency, resolvedRepeater.videoRx ?? null);
return mergeResults(interference, compatibility, resolvedRepeater.missing ?? []);
```

`mergeResults()` must keep the higher-severity result, concatenate unique reasons, and prevent `good` when required repeater data is missing. Preserve the current result fields used by the UI: `frequency`, `level`, `label`, `marginMHz`, `reasons`, `group`, and `channel`.

- [ ] **Step 4: Run analysis tests and verify GREEN**

Run: `node --test tests/analysis.test.js`

Expected: all old and new analysis tests PASS.

- [ ] **Step 5: Commit analysis changes**

```bash
git add src/analysis.js tests/analysis.test.js
git commit -m "feat: analyze repeater rx and tx separately"
```

---

### Task 3: Validation and local profile migration

**Files:**
- Modify: `src/validation.js`
- Modify: `src/storage.js`
- Modify: `tests/validation.test.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Produces: `validateRepeater(repeater: RepeaterConfig): ValidationError[]`.
- Produces: `migrateProfile(value: unknown, factoryProfile): Profile | null` inside `src/storage.js`.
- Changes storage key to `frequency-planner.settings.v2` while reading `frequency-planner.settings.v1` as legacy input.

- [ ] **Step 1: Add failing validation and migration tests**

```js
test('custom repeater accepts a single frequency and a proper range', () => {
  const repeater = { modelId: 'custom', customName: 'Польовий', selections: {}, customRanges: [
    { id: 'a', direction: 'rx', purpose: 'video', start: 4900, end: 6000, label: 'RX' },
    { id: 'b', direction: 'tx', purpose: 'video', start: 1300, end: 1300, label: 'TX' }
  ] };
  assert.deepEqual(validateRepeater(repeater), []);
});

test('custom repeater rejects reversed, negative, and nonnumeric ranges', () => {
  const errors = validateRepeater({ modelId: 'custom', customName: '', selections: {}, customRanges: [
    { id: 'bad', direction: 'tx', purpose: 'video', start: 900, end: 800, label: '' }
  ] });
  assert.ok(errors.some(({ code }) => code === 'INVALID_REPEATER_RANGE'));
  assert.ok(errors.some(({ code }) => code === 'MISSING_REPEATER_NAME'));
});

test('schema v1 settings migrate without losing control and video changes', () => {
  const storage = memoryStorage();
  const legacy = structuredClone(FACTORY_PROFILE);
  delete legacy.repeater;
  legacy.schemaVersion = 1;
  legacy.control.lower.start = 420;
  storage.setItem('frequency-planner.settings.v1', JSON.stringify(legacy));
  const loaded = createSettingsStore(storage, FACTORY_PROFILE).load();
  assert.equal(loaded.profile.schemaVersion, 2);
  assert.equal(loaded.profile.control.lower.start, 420);
  assert.deepEqual(loaded.profile.repeater, FACTORY_PROFILE.repeater);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/validation.test.js tests/storage.test.js`

Expected: FAIL because repeater validation, v2 storage, and migration do not exist.

- [ ] **Step 3: Implement repeater validation**

`validateRepeater()` accepts `modelId: null`, known preset IDs, or `custom`. Custom ranges must have unique IDs, `direction` in `['rx', 'tx']`, `purpose` in `['video', 'control']`, finite nonnegative `start/end`, and `start <= end`. Custom mode requires a nonblank `customName` and at least one video RX entry. Merge its errors into `validateProfile()`.

- [ ] **Step 4: Implement storage migration**

Use constants:

```js
const STORAGE_KEY = 'frequency-planner.settings.v2';
const LEGACY_STORAGE_KEY = 'frequency-planner.settings.v1';
```

On load, prefer v2. If only v1 exists, copy its control and video values onto a clone of the v2 factory profile, validate the migrated result, save it to v2, and return notice `Локальні налаштування оновлено до нової версії.` Reset removes both keys. Invalid legacy data still falls back safely to factory values.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/validation.test.js tests/storage.test.js`

Expected: all validation and migration tests PASS.

- [ ] **Step 6: Commit validation and migration**

```bash
git add src/validation.js src/storage.js tests/validation.test.js tests/storage.test.js
git commit -m "feat: validate and migrate repeater settings"
```

---

### Task 4: Repeater editing state and UI rendering

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/ui.js`
- Modify: `src/app.js`
- Modify: `tests/ui-state.test.js`
- Create: `tests/repeater-ui.test.js`

**Interfaces:**
- Consumes: `REPEATER_MODELS`, `resolveRepeater()`, and `validateRepeater()`.
- Extends: `initialUIState()` with `repeaterEditing: false`.
- Adds DOM IDs: `edit-repeater-button`, `repeater-model`, `repeater-source`, `repeater-status`, `repeater-fields`, `custom-range-list`, and `add-custom-range`.

- [ ] **Step 1: Write failing UI-state tests**

```js
test('repeater editing is locked until confirmation', () => {
  assert.deepEqual(initialUIState(), {
    controlEditing: false, repeaterEditing: false, videoEditing: false
  });
  assert.deepEqual(reduceUIState(initialUIState(), { type: 'CONFIRM_REPEATER_EDIT' }), {
    controlEditing: false, repeaterEditing: true, videoEditing: false
  });
});
```

Add pure view-model tests that do not require a browser DOM:

```js
import { buildRepeaterViewModel, repeaterModelOptions } from '../src/ui.js';

test('repeater model options include presets and custom mode', () => {
  assert.deepEqual(repeaterModelOptions().map(({ value }) => value), [
    '', 'tactech-mavic', 'vishchun-5-8', 'custom'
  ]);
});

test('preset view model exposes source, selections, and locked state', () => {
  const profile = cloneFactoryProfile();
  profile.repeater.modelId = 'vishchun-5-8';
  const view = buildRepeaterViewModel(profile.repeater, false);
  assert.equal(view.sourceUrl, 'https://www.blue-bird.tech/en/products/wireless-retranslator-blue-bird-repeater/');
  assert.equal(view.disabled, true);
  assert.equal(view.fields.videoRx[0].value, 'rx-4990-5945');
});

test('custom view model exposes editable normalized rows', () => {
  const config = {
    modelId: 'custom', customName: 'Польовий', selections: {},
    customRanges: [{ id: 'r1', direction: 'rx', purpose: 'video', start: 4900, end: 6000, label: 'RX' }]
  };
  const view = buildRepeaterViewModel(config, true);
  assert.equal(view.custom, true);
  assert.equal(view.disabled, false);
  assert.deepEqual(view.customRanges[0], config.customRanges[0]);
});
```

- [ ] **Step 2: Run focused UI tests and verify RED**

Run: `node --test tests/ui-state.test.js tests/repeater-ui.test.js`

Expected: FAIL because repeater state and renderer do not exist.

- [ ] **Step 3: Add semantic repeater markup**

Insert a `section.section-card` between control and matrix sections. Include a model `<select>` with `Не вибрано`, two presets, and `Інша модель`; a source `<a target="_blank" rel="noopener noreferrer">`; three labeled channel groups; completeness text; and a hidden custom-range editor. Keep the existing shared save/cancel footer.

- [ ] **Step 4: Extend UI state and confirmation flow**

Add `repeaterEditing` to state, handle `CONFIRM_REPEATER_EDIT`, wire `#edit-repeater-button` to `openConfirmation('CONFIRM_REPEATER_EDIT')`, and update the dialog copy to `Змінити налаштування ретранслятора?`. Cancel and save must relock all three editable sections.

- [ ] **Step 5: Render preset and custom controls**

Create focused helpers in `src/ui.js`:

```js
export const repeaterModelOptions = () => [
  { value: '', label: 'Не вибрано' },
  ...REPEATER_MODELS.map(({ id, name }) => ({ value: id, label: name })),
  { value: 'custom', label: 'Інша модель' }
];

export const buildRepeaterViewModel = (config, editing) => {
  const model = getRepeaterModel(config.modelId);
  return {
    custom: config.modelId === 'custom',
    disabled: !editing,
    sourceUrl: model?.sourceUrl ?? '',
    fields: model?.channels ?? { videoRx: [], videoTx: [], controlTx: [] },
    customRanges: config.customRanges ?? [],
    missing: resolveRepeater(config).missing
  };
};

const renderRepeater = () => {
  const view = buildRepeaterViewModel(draft.repeater, state.repeaterEditing);
  elements.repeaterModel.disabled = view.disabled;
  elements.repeaterSource.hidden = !view.sourceUrl;
  elements.repeaterSource.href = view.sourceUrl || '#';
  elements.repeaterStatus.textContent = view.missing.length
    ? `Потрібне уточнення: ${view.missing.join(', ')}`
    : 'Дані для перевірки заповнені.';
  renderPresetChannelFields(view);
  renderCustomRangeRows(view);
};
```

Implement `renderPresetChannelFields(view)` to replace `#repeater-fields` with labeled `<select>` controls built from `view.fields.videoRx`, `view.fields.videoTx`, and `view.fields.controlTx`. Implement `renderCustomRangeRows(view)` to replace `#custom-range-list` with rows containing direction, purpose, label, start, end, and a delete button for each entry. Both helpers set `disabled = view.disabled` on every editable control.

Every model or channel selection updates `draft.repeater`, reruns `resolveRepeater()`, and calls `render()`. Custom range add creates a stable ID such as `custom-${Date.now()}` with `{ direction: 'rx', purpose: 'video', start: 0, end: 0, label: '' }`; delete filters only that ID and calls `render()`.

- [ ] **Step 6: Pass the resolved repeater into analysis**

Replace the current analysis call:

```js
const analysis = () => analyzeMatrix(draft, resolveRepeater(draft.repeater));
```

Ensure a missing model yields explanatory unknown results rather than a false green result. Keep `src/app.js` responsible only for loading the stored profile and calling `mountUI()`; add no catalog logic to it.

- [ ] **Step 7: Add responsive styles**

Style `.repeater-grid`, `.repeater-summary`, `.channel-config`, `.custom-range-row`, and `.data-completeness` using the existing card, field, badge, and mobile breakpoints. At widths below the existing mobile breakpoint, custom range fields stack vertically and buttons remain at least 44px high.

- [ ] **Step 8: Run focused UI tests and verify GREEN**

Run: `node --test tests/ui-state.test.js tests/repeater-ui.test.js`

Expected: all repeater state and rendering tests PASS.

- [ ] **Step 9: Commit the interface**

```bash
git add index.html styles.css src/ui.js src/app.js tests/ui-state.test.js tests/repeater-ui.test.js
git commit -m "feat: add repeater model interface"
```

---

### Task 5: Full regression, documentation, and GitHub Pages release

**Files:**
- Modify: `README.md`
- Verify: `.github/workflows/pages.yml`
- Verify: all source and test files from Tasks 1–4

**Interfaces:**
- Produces: a public release at the existing Frequency Planner GitHub Pages URL.

- [ ] **Step 1: Update user documentation**

Document the repeater selector, RX/TX distinction, the two source URLs, manual mode, local-only persistence, and the warning that calculations do not replace spectrum-analyzer measurements.

- [ ] **Step 2: Run the full automated suite**

Run: `npm test`

Expected: every test passes with `fail 0`.

- [ ] **Step 3: Run a local static-site smoke check**

Run:

```bash
python3 -m http.server 4173
curl --fail http://127.0.0.1:4173/
curl --fail http://127.0.0.1:4173/src/repeaters.js
```

Expected: both requests return HTTP 200 and the page references no missing module.

- [ ] **Step 4: Manually check the critical flow**

Open the local site and verify: factory profile loads; repeater editing requires confirmation; both presets show their source; Віщун marks all nine factory channels as inside 4990–5945 MHz; nominal Tactical Technology RX shows «Потрібне уточнення»; custom invalid ranges block saving; cancel restores the saved state; refresh preserves saved settings.

- [ ] **Step 5: Commit release documentation**

```bash
git add README.md
git commit -m "docs: explain repeater compatibility planning"
```

- [ ] **Step 6: Publish to GitHub**

Upload/push the commits to `sergioovcharenko/frequency-planner` on `main`. Confirm before the external public update if the active browser policy requires action-time confirmation.

- [ ] **Step 7: Verify GitHub Actions and public deployment**

Confirm the `Test and deploy GitHub Pages` workflow completes successfully, then open the exact deployed URL reported by GitHub Pages. Verify the live DOM contains `Ретранслятор`, `Tactical Technology — Repeater on Mavic`, and `BlueBird Tech — Віщун-5.8` before reporting completion.
