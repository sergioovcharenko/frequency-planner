import test from 'node:test';
import assert from 'node:assert/strict';

import { formatDuplicateMessage, initialUIState, reduceUIState } from '../src/ui.js';

test('duplicate message names the frequency and SA group without K label', () => {
  assert.equal(
    formatDuplicateMessage({ frequency: 5580, firstGroup: '5.5' }),
    '5580 МГц уже використовується в групі SA 5.5. Виберіть іншу частоту.'
  );
});

test('factory controls stay locked until confirmation', () => {
  assert.deepEqual(initialUIState(), { controlEditing: false, videoEditing: false });
  assert.deepEqual(reduceUIState(initialUIState(), { type: 'CONFIRM_CONTROL_EDIT' }), {
    controlEditing: true,
    videoEditing: false
  });
});

test('cancel locks both editing sections again', () => {
  const editing = { controlEditing: true, videoEditing: true };
  assert.deepEqual(reduceUIState(editing, { type: 'CANCEL_EDITING' }), {
    controlEditing: false,
    videoEditing: false
  });
});
