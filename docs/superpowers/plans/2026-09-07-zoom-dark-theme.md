# ZOOM-D Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести весь Frequency Planner на адаптивну темну графітово-помаранчеву тему в стилі ZOOM-D без зміни функціональної логіки.

**Architecture:** Зміна ізольована у дизайн-токенах і компонентах `styles.css`; у `index.html` оновлюється лише системний колір браузера. Контракт теми перевіряється статичним Node.js тестом, а наявні функціональні тести гарантують відсутність регресій.

**Tech Stack:** HTML5, CSS3, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-07-zoom-dark-theme-design.md`

## Global Constraints

- Не змінювати JavaScript, алгоритми аналізу, профілі чи дані ретрансляторів.
- Постійна темна тема має підтримувати екрани від 320px.
- Інтерактивні елементи мають бути не нижчими за 44px.
- Статуси `good`, `watch`, `risk`, `danger`, `unknown` зберігають текстові підписи й окремі кольори.

---

### Task 1: Контракт темної теми

**Files:**
- Create: `tests/theme.test.js`
- Modify: `styles.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: статичні файли `styles.css` та `index.html`.
- Produces: перевірений набір темних токенів, помаранчевий акцент і мобільні брейкпойнти.

- [ ] **Step 1: Write the failing test**

Створити `tests/theme.test.js`, який перевіряє `color-scheme: dark`, основні HEX-токени, `theme-color`, мінімальну висоту 44px і брейкпойнти 760/430px.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/theme.test.js`

Expected: FAIL, тому що поточний CSS використовує `light-dark(...)` і синій акцент.

- [ ] **Step 3: Implement the minimal theme**

Оновити дизайн-токени, поверхні, кнопки, поля, картки, статуси, таблицю, діалог і sticky-панель у `styles.css`; у `index.html` встановити `<meta name="theme-color" content="#080b0f">`.

- [ ] **Step 4: Run theme and full test suites**

Run: `node --test tests/theme.test.js && npm test`

Expected: усі тести PASS без попереджень.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css tests/theme.test.js docs/superpowers/specs/2026-09-07-zoom-dark-theme-design.md docs/superpowers/plans/2026-09-07-zoom-dark-theme.md
git commit -m "style: apply ZOOM-D dark theme"
```

### Task 2: Візуальна перевірка адаптивності

**Files:**
- Modify: `styles.css` only if inspection reveals a layout defect.

**Interfaces:**
- Consumes: готову тему з Task 1.
- Produces: перевірений вигляд на desktop і mobile без горизонтального переповнення сторінки.

- [ ] **Step 1: Start a local static server**

Run: `python3 -m http.server 4173`

- [ ] **Step 2: Inspect desktop and mobile layouts**

Перевірити ширини приблизно 1440px, 768px і 390px: читабельність, прокручування матриці, доступність кнопок, діалогу та sticky-панелі.

- [ ] **Step 3: Correct only observed layout defects**

Якщо дефект знайдено, спочатку додати відповідну статичну перевірку до `tests/theme.test.js`, побачити FAIL, після чого внести мінімальну CSS-зміну.

- [ ] **Step 4: Run final verification**

Run: `npm test && git diff --check`

Expected: усі тести PASS; `git diff --check` не повертає помилок.

