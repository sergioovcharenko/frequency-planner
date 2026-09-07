import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectFile = (name) => new URL(`../${name}`, import.meta.url);

test('page exposes the ZOOM-D dark theme contract on desktop and mobile', async () => {
  const [html, css] = await Promise.all([
    readFile(projectFile('index.html'), 'utf8'),
    readFile(projectFile('styles.css'), 'utf8')
  ]);

  assert.match(html, /<meta name="theme-color" content="#080b0f">/);
  assert.match(css, /color-scheme:\s*dark/);
  assert.match(css, /--page:\s*#080b0f/);
  assert.match(css, /--surface:\s*#11161c/);
  assert.match(css, /--accent:\s*#ff6a00/);
  assert.match(css, /--green:\s*#00d67a/);
  assert.match(css, /button, input, select[^{]*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /@media\s*\(max-width:\s*430px\)/);
});
