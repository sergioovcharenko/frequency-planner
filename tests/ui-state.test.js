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
  assert.deepEqual(initialUIState(), { controlEditing: false, repeaterEditing: false, videoEditing: false });
  assert.deepEqual(reduceUIState(initialUIState(), { type: 'CONFIRM_CONTROL_EDIT' }), {
    controlEditing: true,
    repeaterEditing: false,
    videoEditing: false
  });
});

test('repeater editing is locked until confirmation', () => {
  assert.deepEqual(reduceUIState(initialUIState(), { type: 'CONFIRM_REPEATER_EDIT' }), {
    controlEditing: false,
    repeaterEditing: true,
    videoEditing: false
  });
});

test('cancel locks all editing sections again', () => {
  const editing = { controlEditing: true, repeaterEditing: true, videoEditing: true };
  assert.deepEqual(reduceUIState(editing, { type: 'CANCEL_EDITING' }), {
    controlEditing: false,
    repeaterEditing: false,
    videoEditing: false
  });
});
