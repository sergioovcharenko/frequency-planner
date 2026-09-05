import { analyzeMatrix, rankRecommendations } from './analysis.js';
import { findDuplicateAssignment, validateProfile } from './validation.js';

export const initialUIState = () => ({ controlEditing: false, videoEditing: false });

export const reduceUIState = (state, action) => {
  if (action.type === 'CONFIRM_CONTROL_EDIT') return { ...state, controlEditing: true };
  if (action.type === 'CONFIRM_VIDEO_EDIT') return { ...state, videoEditing: true };
  if (action.type === 'CANCEL_EDITING' || action.type === 'SAVE_EDITING') return initialUIState();
  return state;
};

export const formatDuplicateMessage = ({ frequency, firstGroup }) =>
  `${frequency} МГц уже використовується в групі SA ${firstGroup}. Виберіть іншу частоту.`;

const selectors = {
  lowerStart: '#lower-start', lowerEnd: '#lower-end',
  upperStart: '#upper-start', upperEnd: '#upper-end'
};

const setNotice = (elements, message, kind = 'info') => {
  elements.notice.hidden = !message;
  elements.notice.textContent = message ?? '';
  elements.notice.dataset.kind = kind;
};

const optionList = (catalog, current) => [...new Set([...catalog, current])].sort((a, b) => a - b);

export const mountUI = ({ document, profile: initialProfile, store }) => {
  let profile = structuredClone(initialProfile);
  let draft = structuredClone(initialProfile);
  let state = initialUIState();
  let selected = { groupIndex: 0, channelIndex: 0 };
  let pendingAction = null;

  const elements = {
    notice: document.querySelector('#notice'),
    matrixBody: document.querySelector('#matrix-body'),
    activeSa: document.querySelector('#active-sa'),
    activeSb: document.querySelector('#active-sb'),
    resultFrequency: document.querySelector('#result-frequency'),
    resultStatus: document.querySelector('#result-status'),
    resultPosition: document.querySelector('#result-position'),
    resultReasons: document.querySelector('#result-reasons'),
    recommendationList: document.querySelector('#recommendation-list'),
    editActions: document.querySelector('#edit-actions'),
    saveButton: document.querySelector('#save-button'),
    dialog: document.querySelector('#confirm-dialog'),
    dialogTitle: document.querySelector('#dialog-title'),
    dialogText: document.querySelector('#dialog-text'),
    dialogConfirm: document.querySelector('#dialog-confirm')
  };

  const rangeInputs = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, document.querySelector(selector)]));

  const analysis = () => analyzeMatrix(draft, { occupiedRanges: [] });

  const renderRanges = () => {
    rangeInputs.lowerStart.value = draft.control.lower.start;
    rangeInputs.lowerEnd.value = draft.control.lower.end;
    rangeInputs.upperStart.value = draft.control.upper.start;
    rangeInputs.upperEnd.value = draft.control.upper.end;
    Object.values(rangeInputs).forEach((input) => { input.disabled = !state.controlEditing; });
  };

  const renderResult = (results) => {
    const item = results.find((result) => result.group === draft.video.groups[selected.groupIndex] && result.channel === selected.channelIndex + 1) ?? results[0];
    elements.resultFrequency.textContent = item.frequency;
    elements.resultStatus.className = `status-badge ${item.level}`;
    elements.resultStatus.textContent = item.label;
    elements.resultPosition.textContent = `SA ${item.group} · частота ${item.frequency} МГц`;
    elements.activeSa.textContent = `SA · ${item.group}`;
    elements.activeSb.textContent = `SB · частота ${item.frequency}`;
    elements.resultReasons.replaceChildren(...item.reasons.map((reason) => {
      const li = document.createElement('li');
      li.textContent = reason;
      return li;
    }));

    elements.recommendationList.replaceChildren(...rankRecommendations(results).slice(0, 3).map((result) => {
      const li = document.createElement('li');
      li.textContent = `${result.frequency} МГц · SA ${result.group}`;
      return li;
    }));
  };

  const renderMatrix = (results) => {
    const rows = [0, 1, 2].map((channelIndex) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = `K${channelIndex + 1}`;
      tr.append(th);

      draft.video.matrix.forEach((group, groupIndex) => {
        const frequency = group[channelIndex];
        const result = results.find((item) => item.group === draft.video.groups[groupIndex] && item.channel === channelIndex + 1);
        const td = document.createElement('td');
        const wrapper = document.createElement('div');
        wrapper.className = `channel-cell ${result.level}${selected.groupIndex === groupIndex && selected.channelIndex === channelIndex ? ' selected' : ''}`;
        wrapper.dataset.group = String(groupIndex);
        wrapper.dataset.channel = String(channelIndex);

        if (state.videoEditing) {
          const select = document.createElement('select');
          select.setAttribute('aria-label', `SA ${draft.video.groups[groupIndex]}, позиція ${channelIndex + 1}`);
          optionList(draft.video.catalog, frequency).forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = `${value} МГц`;
            option.selected = value === frequency;
            select.append(option);
          });
          select.addEventListener('change', () => {
            draft.video.matrix[groupIndex][channelIndex] = Number(select.value);
            selected = { groupIndex, channelIndex };
            render();
          });
          wrapper.append(select);
        } else {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'channel-button';
          button.innerHTML = `<strong>${frequency}</strong><span>${result.label}</span>`;
          button.addEventListener('click', () => {
            selected = { groupIndex, channelIndex };
            render();
          });
          wrapper.append(button);
        }
        td.append(wrapper);
        tr.append(td);
      });
      return tr;
    });
    elements.matrixBody.replaceChildren(...rows);
  };

  const renderValidation = () => {
    const errors = validateProfile(draft);
    const duplicate = findDuplicateAssignment(draft.video.matrix);
    if (duplicate) setNotice(elements, formatDuplicateMessage(duplicate), 'error');
    else if (errors.length) setNotice(elements, errors[0].message, 'error');
    else if (state.controlEditing || state.videoEditing) setNotice(elements, 'Перевірте зміни та натисніть «Зберегти».', 'info');
    else setNotice(elements, null);
    elements.saveButton.disabled = errors.length > 0;
  };

  const render = () => {
    const results = analysis();
    renderRanges();
    renderMatrix(results);
    renderResult(results);
    renderValidation();
    elements.editActions.hidden = !(state.controlEditing || state.videoEditing);
  };

  const openConfirmation = (action) => {
    pendingAction = action;
    const restoring = action === 'RESTORE';
    elements.dialogTitle.textContent = restoring ? 'Відновити штатні налаштування?' : 'Змінити штатні налаштування?';
    elements.dialogText.textContent = restoring
      ? 'Усі збережені зміни діапазонів і відеоканалів буде видалено.'
      : 'Зміна штатних частот може вплинути на зв’язок. Продовжити?';
    elements.dialogConfirm.textContent = restoring ? 'Відновити' : 'Підтвердити';
    elements.dialog.showModal();
  };

  document.querySelector('#edit-control-button').addEventListener('click', () => openConfirmation('CONFIRM_CONTROL_EDIT'));
  document.querySelector('#edit-video-button').addEventListener('click', () => openConfirmation('CONFIRM_VIDEO_EDIT'));
  document.querySelector('#restore-button').addEventListener('click', () => openConfirmation('RESTORE'));

  elements.dialog.addEventListener('close', () => {
    if (elements.dialog.returnValue !== 'confirm' || !pendingAction) return;
    if (pendingAction === 'RESTORE') {
      profile = store.reset();
      draft = structuredClone(profile);
      state = initialUIState();
      selected = { groupIndex: 0, channelIndex: 0 };
      setNotice(elements, 'Штатні налаштування відновлено.', 'success');
    } else {
      state = reduceUIState(state, { type: pendingAction });
    }
    pendingAction = null;
    render();
  });

  const updateRange = (band, edge, value) => {
    draft.control[band][edge] = Number(value);
    renderValidation();
    renderResult(analysis());
  };
  rangeInputs.lowerStart.addEventListener('input', (event) => updateRange('lower', 'start', event.target.value));
  rangeInputs.lowerEnd.addEventListener('input', (event) => updateRange('lower', 'end', event.target.value));
  rangeInputs.upperStart.addEventListener('input', (event) => updateRange('upper', 'start', event.target.value));
  rangeInputs.upperEnd.addEventListener('input', (event) => updateRange('upper', 'end', event.target.value));

  document.querySelector('#cancel-button').addEventListener('click', () => {
    draft = structuredClone(profile);
    state = reduceUIState(state, { type: 'CANCEL_EDITING' });
    render();
  });

  elements.saveButton.addEventListener('click', () => {
    const result = store.save(draft);
    if (!result.ok) {
      setNotice(elements, result.error, 'error');
      return;
    }
    profile = structuredClone(draft);
    state = reduceUIState(state, { type: 'SAVE_EDITING' });
    render();
    setNotice(elements, 'Налаштування збережено на цьому пристрої.', 'success');
  });

  render();
};
