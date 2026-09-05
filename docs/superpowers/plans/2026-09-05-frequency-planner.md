# Frequency Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Побудувати й опублікувати статичний GitHub Pages застосунок для безпечного редагування штатних частот одного комплексу та попередньої оцінки ризику.

**Architecture:** HTML/CSS/ES modules без фреймворку та бекенду. Чисті модулі `profiles`, `validation`, `analysis` і `storage` тестуються стандартним `node:test`; `ui` зв’язує їх із DOM, а GitHub Actions публікує корінь репозиторію на Pages.

**Tech Stack:** HTML5, CSS3, JavaScript ES2022 modules, Node.js 22 test runner, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-05-frequency-planner-design.md`

## Global Constraints

- Один комплекс за один розрахунок.
- Нижній діапазон: дозволено 410–485 МГц, штатно 410–485 МГц, горизонтальна поляризація, 30 перестроювань/с.
- Верхній діапазон: дозволено 820–895 МГц, штатно 820–895 МГц, вертикальна поляризація, 30 перестроювань/с.
- Матриця SA/SB має дев’ять заводських значень зі специфікації.
- Каталог містить рівно 18 унікальних значень зі специфікації.
- Заводські 5700, 5765 і 5825 залишаються доступними у своїх поточних позиціях.
- Налаштування не надсилаються на сервер і зберігаються лише в `localStorage`.
- Оцінка не показує вигадані dBm і завжди називає гармонічні висновки розрахунковими.
- Інтерфейс підтримує ширини 320, 736 і 1024 пікселі та не покладається лише на колір.

---

## File Map

- `index.html` — семантичний каркас застосунку й діалог підтвердження.
- `styles.css` — адаптивний світлий/темний інтерфейс.
- `src/profiles.js` — незмінні заводські дані й клонування профілю.
- `src/validation.js` — валідація діапазонів, каталогу та унікальності матриці.
- `src/analysis.js` — статуси, причини та сортування рекомендацій.
- `src/storage.js` — версійоване читання/запис `localStorage`.
- `src/ui.js` — рендер, блокування, підтвердження й повідомлення.
- `src/app.js` — запуск і координація модулів.
- `tests/*.test.js` — модульні тести бізнес-логіки.
- `package.json` — команди тестування.
- `.github/workflows/pages.yml` — перевірка й публікація GitHub Pages.
- `README.md` — локальний запуск, тести й обмеження оцінки.

### Task 1: Factory profile and project test harness

**Files:**
- Create: `package.json`
- Create: `src/profiles.js`
- Test: `tests/profiles.test.js`

**Interfaces:**
- Produces: `FACTORY_PROFILE`, `cloneFactoryProfile()`.

- [ ] **Step 1: Write the failing factory-profile test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { FACTORY_PROFILE, cloneFactoryProfile } from '../src/profiles.js';

test('factory profile contains the approved ranges and matrix', () => {
  assert.deepEqual(FACTORY_PROFILE.control.lower, { min: 410, max: 485, start: 410, end: 485, polarization: 'H', hopsPerSecond: 30 });
  assert.deepEqual(FACTORY_PROFILE.control.upper, { min: 820, max: 895, start: 820, end: 895, polarization: 'V', hopsPerSecond: 30 });
  assert.deepEqual(FACTORY_PROFILE.video.matrix, [[5180, 5240, 5300], [5520, 5580, 5640], [5700, 5765, 5825]]);
  assert.equal(FACTORY_PROFILE.video.catalog.length, 18);
  assert.equal(new Set(FACTORY_PROFILE.video.catalog).size, 18);
  assert.deepEqual(cloneFactoryProfile(), FACTORY_PROFILE);
  assert.notEqual(cloneFactoryProfile(), FACTORY_PROFILE);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/profiles.test.js`

Expected: FAIL because `src/profiles.js` does not exist.

- [ ] **Step 3: Implement the immutable profile and clone**

```js
export const FACTORY_PROFILE = Object.freeze({
  schemaVersion: 1,
  name: 'Штатний профіль',
  control: {
    lower: { min: 410, max: 485, start: 410, end: 485, polarization: 'H', hopsPerSecond: 30 },
    upper: { min: 820, max: 895, start: 820, end: 895, polarization: 'V', hopsPerSecond: 30 }
  },
  video: {
    groups: ['5.2', '5.5', '5.8'],
    matrix: [[5180, 5240, 5300], [5520, 5580, 5640], [5700, 5765, 5825]],
    catalog: [5180, 5200, 5220, 5240, 5260, 5280, 5300, 5320, 5500, 5520, 5540, 5560, 5580, 5600, 5620, 5640, 5660, 5680]
  }
});

export const cloneFactoryProfile = () => structuredClone(FACTORY_PROFILE);
```

Create `package.json` with `"type": "module"` and `"test": "node --test"`.

- [ ] **Step 4: Run the test and verify pass**

Run: `npm test -- tests/profiles.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json src/profiles.js tests/profiles.test.js
git commit -m "feat: add factory frequency profile"
```

### Task 2: Validation rules

**Files:**
- Create: `src/validation.js`
- Test: `tests/validation.test.js`

**Interfaces:**
- Consumes: profile shape from `src/profiles.js`.
- Produces: `validateRange(range)`, `findDuplicateAssignment(matrix)`, `validateCatalog(catalog)`, `validateProfile(profile)`.

- [ ] **Step 1: Write failing validation tests**

Test exact boundary acceptance, rejection of `409–485`, `410–486`, `485–410`, a repeated `5580`, and a catalog with 17 or duplicated entries. Assert error codes `OUT_OF_BOUNDS`, `INVALID_ORDER`, `DUPLICATE_VIDEO`, and `INVALID_CATALOG`.

```js
assert.deepEqual(validateRange({ min: 410, max: 485, start: 420, end: 470 }), []);
assert.equal(validateRange({ min: 410, max: 485, start: 409, end: 470 })[0].code, 'OUT_OF_BOUNDS');
assert.equal(validateRange({ min: 410, max: 485, start: 470, end: 420 })[0].code, 'INVALID_ORDER');
assert.deepEqual(findDuplicateAssignment([[5180, 5240, 5300], [5520, 5580, 5640], [5700, 5580, 5825]]), { frequency: 5580, firstGroup: '5.5', secondGroup: '5.8' });
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/validation.test.js`

Expected: FAIL because exports are missing.

- [ ] **Step 3: Implement pure validation functions**

Use numeric finite checks, inclusive min/max bounds, strict `start < end`, a `Map` for duplicate detection, and an exact catalog length of 18 with unique finite numbers. `validateProfile` combines all errors without throwing.

- [ ] **Step 4: Run validation tests**

Run: `npm test -- tests/validation.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/validation.js tests/validation.test.js
git commit -m "feat: validate frequency settings"
```

### Task 3: Deterministic risk analysis

**Files:**
- Create: `src/analysis.js`
- Test: `tests/analysis.test.js`

**Interfaces:**
- Produces: `analyzeFrequency(frequency, context)`, `analyzeMatrix(profile, repeater)`, `rankRecommendations(results)`.
- `analyzeFrequency` returns `{ frequency, level, label, reasons }` where `level` is `good|watch|risk|danger|unknown`.

- [ ] **Step 1: Write failing analysis tests**

Cover direct overlap as `danger`, 11–27 MHz separation as `watch`, an exact mathematical harmonic as `risk`, missing repeater data as `unknown`, and stable recommendation ordering by severity then margin.

```js
assert.equal(analyzeFrequency(5580, { occupiedRanges: [{ start: 5575, end: 5585 }], controlRanges: [] }).level, 'danger');
assert.equal(analyzeFrequency(5580, { occupiedRanges: [{ start: 5550, end: 5555 }], controlRanges: [] }).level, 'watch');
assert.equal(analyzeFrequency(5180, { occupiedRanges: [], controlRanges: [{ start: 820, end: 895 }] }).level, 'risk');
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/analysis.test.js`

Expected: FAIL because `src/analysis.js` does not exist.

- [ ] **Step 3: Implement analysis**

Compute distance from the video frequency to each occupied interval. Use `danger` for overlap or distance at most 10 MHz, `watch` for distance from 11 through 27 MHz, and `good` above 27 MHz when no stronger rule applies. For control harmonics, test orders 2 through 15 against interval `[order * start, order * end]` and add a clearly labeled mathematical warning; never synthesize dBm. Unknown or incomplete context returns `unknown` instead of green.

- [ ] **Step 4: Run analysis tests**

Run: `npm test -- tests/analysis.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analysis.js tests/analysis.test.js
git commit -m "feat: add deterministic risk analysis"
```

### Task 4: Versioned local storage

**Files:**
- Create: `src/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces: `createSettingsStore(storage, factoryProfile)`, returning `{ load, save, reset }`.

- [ ] **Step 1: Write failing tests with an in-memory Storage double**

Assert factory fallback for empty, malformed JSON, wrong schema version, and invalid profile. Assert `save` persists valid data and `reset` removes the key `frequency-planner.settings.v1`.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/storage.test.js`

Expected: FAIL because `src/storage.js` does not exist.

- [ ] **Step 3: Implement the store**

Inject the `Storage` dependency, catch parse/quota errors, validate before returning saved data, deep-clone the factory fallback, and return `{ profile, notice }` from `load()`.

- [ ] **Step 4: Run storage tests**

Run: `npm test -- tests/storage.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage.js tests/storage.test.js
git commit -m "feat: persist planner settings locally"
```

### Task 5: Responsive interface and guarded editing

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/ui.js`
- Create: `src/app.js`
- Test: `tests/ui-state.test.js`

**Interfaces:**
- Consumes: profile, validation, analysis, and store modules.
- Produces: browser entry point `src/app.js` and pure `formatDuplicateMessage(error)`.

- [ ] **Step 1: Write the failing copy/state test**

```js
assert.equal(formatDuplicateMessage({ frequency: 5580, firstGroup: '5.5' }), '5580 МГц уже використовується в групі SA 5.5. Виберіть іншу частоту.');
```

Also assert that factory edit state is locked and becomes editable only after an explicit confirmation action in the exported state reducer.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/ui-state.test.js`

Expected: FAIL because UI exports are missing.

- [ ] **Step 3: Build semantic HTML and UI module**

Implement the approved header, control-band cards, four locked range inputs, 3×3 SA/SB matrix, per-cell selects, selected-frequency explanation, status legend, native `<dialog>` confirmation, Save/Cancel/Restore actions, and `aria-live="polite"` messages. Disable Save whenever validation returns an error.

- [ ] **Step 4: Add responsive theme-aware CSS**

Use CSS Grid, system fonts, `prefers-color-scheme`, blue active SA/SB states, and paired icon/text statuses. At widths below 720px, stack the explanation below the matrix and keep every interactive target at least 44px tall.

- [ ] **Step 5: Run all tests and a local HTTP smoke test**

Run: `npm test`

Run: `python3 -m http.server 4173`

Expected: all tests PASS; `http://localhost:4173/` loads without module or console errors; editing requires confirmation; duplicate selection disables Save; refresh restores saved settings; factory reset restores all defaults.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css src/ui.js src/app.js tests/ui-state.test.js
git commit -m "feat: build frequency planner interface"
```

### Task 6: Documentation, CI, and GitHub Pages publishing

**Files:**
- Create: `README.md`
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: root static site and `npm test`.
- Produces: public GitHub Pages deployment.

- [ ] **Step 1: Add README**

Document the purpose, public URL pattern `https://sergioovcharenko.github.io/frequency-planner/`, `npm test`, local server command, factory frequencies, local-only storage, and the warning that calculated risk is not a measured RF guarantee.

- [ ] **Step 2: Add Pages workflow**

Create a workflow triggered on pushes to `main` and manual dispatch. Grant `contents: read`, `pages: write`, and `id-token: write`; run `npm test`; upload the repository root with `actions/upload-pages-artifact`; deploy with `actions/deploy-pages` in the `github-pages` environment.

- [ ] **Step 3: Run final local verification**

Run: `npm test`

Run: `git diff --check`

Expected: all tests PASS and no whitespace errors.

- [ ] **Step 4: Commit deployment files**

```bash
git add README.md .github/workflows/pages.yml
git commit -m "ci: deploy frequency planner to pages"
```

- [ ] **Step 5: Create and push the remote repository**

Create public repository `sergioovcharenko/frequency-planner`, add it as `origin`, and push `main`. If browser authorization is required, use the advertised GitHub sign-in flow and do not request credentials in chat.

- [ ] **Step 6: Verify the public site**

Open `https://sergioovcharenko.github.io/frequency-planner/`, wait for the Pages workflow to complete, then verify desktop and mobile loading, editing confirmation, duplicate warning, persistence, reset, and absence of console errors.

- [ ] **Step 7: Record final deployment commit**

Run: `git log -1 --oneline` and include the commit plus public URL in the handoff.
