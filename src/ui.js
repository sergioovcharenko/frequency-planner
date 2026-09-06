import { analyzeMatrix, rankRecommendations } from './analysis.js';
import { REPEATER_MODELS, getRepeaterModel, resolveRepeater } from './repeaters.js';
import { findDuplicateAssignment, validateProfile } from './validation.js';

export const initialUIState = () => ({ controlEditing: false, repeaterEditing: false, videoEditing: false });

export const reduceUIState = (state, action) => {
  if (action.type === 'CONFIRM_CONTROL_EDIT') return { ...state, controlEditing: true };
  if (action.type === 'CONFIRM_REPEATER_EDIT') return { ...state, repeaterEditing: true };
  if (action.type === 'CONFIRM_VIDEO_EDIT') return { ...state, videoEditing: true };
  if (action.type === 'CANCEL_EDITING' || action.type === 'SAVE_EDITING') return initialUIState();
  return state;
};

export const formatDuplicateMessage = ({ frequency, firstGroup }) =>
  `${frequency} МГц уже використовується в групі SA ${firstGroup}. Виберіть іншу частоту.`;

export const formatHarmonicSummary = (result) => {
  const orders = [...new Set([
    ...(result.harmonics ?? []).map(({ order }) => order),
    ...(result.advisoryHarmonics ?? []).map(({ order }) => order)
  ])].sort((left, right) => left - right);
  return orders.length ? `Гармоніки: ${orders.join(', ')}` : '';
};

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

export const repeaterModelOptions = () => [
  { value: '', label: 'Не вибрано' },
  ...REPEATER_MODELS.map(({ id, name }) => ({ value: id, label: name })),
  { value: 'custom', label: 'Інша модель' }
];

export const buildRepeaterViewModel = (config, editing) => {
  const model = getRepeaterModel(config?.modelId);
  return {
    custom: config?.modelId === 'custom',
    disabled: !editing,
    sourceUrl: model?.sourceUrl ?? '',
    fields: model?.channels ?? { videoRx: [], videoTx: [], controlTx: [] },
    channelNotes: model?.channelNotes ?? {},
    customRanges: config?.customRanges ?? [],
    missing: resolveRepeater(config).missing
  };
};

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
    repeaterModel: document.querySelector('#repeater-model'),
    repeaterSource: document.querySelector('#repeater-source'),
    repeaterStatus: document.querySelector('#repeater-status'),
    repeaterFields: document.querySelector('#repeater-fields'),
    customRepeater: document.querySelector('#custom-repeater'),
    customRepeaterName: document.querySelector('#custom-repeater-name'),
    customRangeList: document.querySelector('#custom-range-list'),
    addCustomRange: document.querySelector('#add-custom-range'),
    editActions: document.querySelector('#edit-actions'),
    saveButton: document.querySelector('#save-button'),
    dialog: document.querySelector('#confirm-dialog'),
    dialogTitle: document.querySelector('#dialog-title'),
    dialogText: document.querySelector('#dialog-text'),
    dialogConfirm: document.querySelector('#dialog-confirm')
  };

  const rangeInputs = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, document.querySelector(selector)]));

  const analysis = () => analyzeMatrix(draft, resolveRepeater(draft.repeater));

  const renderRanges = () => {
    rangeInputs.lowerStart.value = draft.control.lower.start;
    rangeInputs.lowerEnd.value = draft.control.lower.end;
    rangeInputs.upperStart.value = draft.control.upper.start;
    rangeInputs.upperEnd.value = draft.control.upper.end;
    Object.values(rangeInputs).forEach((input) => { input.disabled = !state.controlEditing; });
  };

  const appendOptions = (select, options, selectedValue) => {
    select.replaceChildren(...options.map(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = value === selectedValue;
      return option;
    }));
  };

  const renderPresetChannelFields = (view) => {
    const definitions = [
      { key: 'videoRx', label: 'Приймання від FPV' },
      { key: 'videoTx', label: 'Передавання на землю' },
      { key: 'controlTx', label: 'Керування FPV' }
    ];
    const nodes = definitions.map(({ key, label }) => {
      const channels = view.fields[key];
      if (!channels.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-channel';
        empty.textContent = `${label}: ${view.channelNotes[key] ?? 'дані у відкритих джерелах відсутні.'}`;
        return empty;
      }
      const field = document.createElement('label');
      field.textContent = label;
      const select = document.createElement('select');
      select.disabled = view.disabled;
      select.setAttribute('aria-label', label);
      appendOptions(select, [
        { value: '', label: 'Не вибрано' },
        ...channels.map(({ id, label: channelLabel }) => ({ value: id, label: channelLabel }))
      ], draft.repeater.selections[key]);
      select.addEventListener('change', () => {
        draft.repeater.selections[key] = select.value || null;
        render();
      });
      field.append(select);
      return field;
    });
    elements.repeaterFields.replaceChildren(...nodes);
  };

  const renderCustomRangeRows = (view) => {
    const rows = view.customRanges.map((channel) => {
      const row = document.createElement('div');
      row.className = 'custom-range-row';
      const selectField = (label, key, options) => {
        const field = document.createElement('label');
        field.textContent = label;
        const select = document.createElement('select');
        select.disabled = view.disabled;
        appendOptions(select, options, channel[key]);
        select.addEventListener('change', () => {
          channel[key] = select.value;
          render();
        });
        field.append(select);
        return field;
      };
      const inputField = (label, key, type = 'text') => {
        const field = document.createElement('label');
        field.textContent = label;
        const input = document.createElement('input');
        input.type = type;
        input.disabled = view.disabled;
        input.value = channel[key];
        if (type === 'number') input.min = '0';
        input.addEventListener('input', () => {
          channel[key] = type === 'number' ? Number(input.value) : input.value;
          renderValidation();
          renderResult(analysis());
        });
        field.append(input);
        return field;
      };
      row.append(
        selectField('Напрямок', 'direction', [{ value: 'rx', label: 'RX' }, { value: 'tx', label: 'TX' }]),
        selectField('Призначення', 'purpose', [{ value: 'video', label: 'Відео' }, { value: 'control', label: 'Керування' }]),
        inputField('Назва', 'label'),
        inputField('Початок, МГц', 'start', 'number'),
        inputField('Кінець, МГц', 'end', 'number')
      );
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button button-ghost';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Видалити ${channel.label || 'діапазон'}`);
      remove.disabled = view.disabled;
      remove.addEventListener('click', () => {
        draft.repeater.customRanges = draft.repeater.customRanges.filter(({ id }) => id !== channel.id);
        render();
      });
      row.append(remove);
      return row;
    });
    elements.customRangeList.replaceChildren(...rows);
  };

  const renderRepeater = () => {
    const view = buildRepeaterViewModel(draft.repeater, state.repeaterEditing);
    appendOptions(elements.repeaterModel, repeaterModelOptions(), draft.repeater.modelId ?? '');
    elements.repeaterModel.disabled = view.disabled;
    elements.repeaterSource.hidden = !view.sourceUrl;
    elements.repeaterSource.href = view.sourceUrl || '#';
    elements.repeaterStatus.className = `data-completeness ${view.missing.length ? 'incomplete' : 'complete'}`;
    elements.repeaterStatus.textContent = view.missing.length
      ? `Потрібне уточнення: ${view.missing.join(', ')}.`
      : 'Дані для перевірки заповнені.';
    elements.customRepeater.hidden = !view.custom;
    elements.customRepeaterName.disabled = view.disabled;
    elements.customRepeaterName.value = draft.repeater.customName;
    elements.addCustomRange.disabled = view.disabled;
    if (view.custom) {
      elements.repeaterFields.replaceChildren();
      renderCustomRangeRows(view);
    } else {
      elements.customRangeList.replaceChildren();
      renderPresetChannelFields(view);
    }
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
          const harmonicSummary = formatHarmonicSummary(result);
          button.innerHTML = `<strong>${frequency}</strong><span>${result.label}</span>${harmonicSummary ? `<small>${harmonicSummary}</small>` : ''}`;
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
    else if (state.controlEditing || state.repeaterEditing || state.videoEditing) setNotice(elements, 'Перевірте зміни та натисніть «Зберегти».', 'info');
    else setNotice(elements, null);
    elements.saveButton.disabled = errors.length > 0;
  };

  const render = () => {
    const results = analysis();
    renderRanges();
    renderRepeater();
    renderMatrix(results);
    renderResult(results);
    renderValidation();
    elements.editActions.hidden = !(state.controlEditing || state.repeaterEditing || state.videoEditing);
  };

  const openConfirmation = (action) => {
    pendingAction = action;
    const restoring = action === 'RESTORE';
    const repeaterEditing = action === 'CONFIRM_REPEATER_EDIT';
    elements.dialogTitle.textContent = restoring
      ? 'Відновити штатні налаштування?'
      : repeaterEditing ? 'Змінити налаштування ретранслятора?' : 'Змінити штатні налаштування?';
    elements.dialogText.textContent = restoring
      ? 'Усі збережені зміни діапазонів, ретранслятора і відеоканалів буде видалено.'
      : repeaterEditing
        ? 'Вибір моделі та її частот вплине на оцінку сумісності. Продовжити?'
        : 'Зміна штатних частот може вплинути на зв’язок. Продовжити?';
    elements.dialogConfirm.textContent = restoring ? 'Відновити' : 'Підтвердити';
    elements.dialog.showModal();
  };

  document.querySelector('#edit-control-button').addEventListener('click', () => openConfirmation('CONFIRM_CONTROL_EDIT'));
  document.querySelector('#edit-repeater-button').addEventListener('click', () => openConfirmation('CONFIRM_REPEATER_EDIT'));
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

  elements.repeaterModel.addEventListener('change', () => {
    const modelId = elements.repeaterModel.value || null;
    draft.repeater.modelId = modelId;
    draft.repeater.selections = { videoRx: null, videoTx: null, controlTx: null };
    if (modelId && modelId !== 'custom') {
      const model = getRepeaterModel(modelId);
      for (const key of ['videoRx', 'videoTx', 'controlTx']) {
        draft.repeater.selections[key] = model.channels[key][0]?.id ?? null;
      }
    }
    render();
  });

  elements.customRepeaterName.addEventListener('input', () => {
    draft.repeater.customName = elements.customRepeaterName.value;
    renderValidation();
  });

  elements.addCustomRange.addEventListener('click', () => {
    draft.repeater.customRanges.push({
      id: `custom-${Date.now()}`,
      direction: 'rx',
      purpose: 'video',
      start: 0,
      end: 0,
      label: ''
    });
    render();
  });

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
