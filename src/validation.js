import { getRepeaterModel } from './repeaters.js';

const GROUPS = ['5.2', '5.5', '5.8'];

const error = (code, message, details = {}) => ({ code, message, ...details });

export const validateRange = (range) => {
  if (!range || !['min', 'max', 'start', 'end'].every((key) => Number.isFinite(range[key]))) {
    return [error('INVALID_NUMBER', 'Усі межі мають бути числами.')];
  }

  const errors = [];
  if (range.start < range.min || range.end > range.max) {
    errors.push(error('OUT_OF_BOUNDS', `Дозволений діапазон: ${range.min}–${range.max} МГц.`));
  }
  if (range.start >= range.end) {
    errors.push(error('INVALID_ORDER', 'Початок має бути меншим за кінець.'));
  }
  return errors;
};

export const findDuplicateAssignment = (matrix) => {
  if (!Array.isArray(matrix)) return null;
  const seen = new Map();

  for (let groupIndex = 0; groupIndex < matrix.length; groupIndex += 1) {
    const row = matrix[groupIndex];
    if (!Array.isArray(row)) continue;
    for (const frequency of row) {
      if (seen.has(frequency)) {
        return {
          frequency,
          firstGroup: GROUPS[seen.get(frequency)] ?? String(seen.get(frequency) + 1),
          secondGroup: GROUPS[groupIndex] ?? String(groupIndex + 1)
        };
      }
      seen.set(frequency, groupIndex);
    }
  }
  return null;
};

export const validateCatalog = (catalog) => {
  const valid = Array.isArray(catalog)
    && catalog.length === 18
    && catalog.every(Number.isFinite)
    && new Set(catalog).size === 18;
  return valid ? [] : [error('INVALID_CATALOG', 'Каталог має містити 18 унікальних числових частот.')];
};

export const validateRepeater = (repeater) => {
  if (!repeater) return [error('INVALID_REPEATER', 'Структура налаштувань ретранслятора пошкоджена.')];
  if (repeater.modelId === null) return [];
  if (repeater.modelId !== 'custom') {
    return getRepeaterModel(repeater.modelId)
      ? []
      : [error('UNKNOWN_REPEATER_MODEL', 'Невідома модель ретранслятора.')];
  }

  const errors = [];
  if (!repeater.customName?.trim()) {
    errors.push(error('MISSING_REPEATER_NAME', 'Вкажіть назву ретранслятора.'));
  }
  if (!Array.isArray(repeater.customRanges)) {
    return [...errors, error('INVALID_REPEATER_RANGES', 'Список частот ретранслятора пошкоджений.')];
  }

  const ids = new Set();
  let hasVideoRx = false;
  for (const channel of repeater.customRanges) {
    if (ids.has(channel?.id)) {
      errors.push(error('DUPLICATE_REPEATER_RANGE', 'Ідентифікатор частоти ретранслятора повторюється.'));
    }
    ids.add(channel?.id);

    const validType = ['rx', 'tx'].includes(channel?.direction)
      && ['video', 'control'].includes(channel?.purpose);
    if (!validType) {
      errors.push(error('INVALID_REPEATER_CHANNEL', 'Оберіть напрямок і призначення каналу ретранслятора.'));
    }
    if (channel?.direction === 'rx' && channel?.purpose === 'video') hasVideoRx = true;

    const validRange = Number.isFinite(channel?.start)
      && Number.isFinite(channel?.end)
      && channel.start >= 0
      && channel.end >= 0
      && channel.start <= channel.end;
    if (!validRange) {
      errors.push(error('INVALID_REPEATER_RANGE', 'Початок і кінець частоти мають бути невід’ємними числами, початок — не більшим за кінець.'));
    }
  }
  if (!hasVideoRx) {
    errors.push(error('MISSING_VIDEO_RX', 'Додайте діапазон приймання відео.'));
  }
  return errors;
};

export const validateProfile = (profile) => {
  if (!profile?.control?.lower || !profile?.control?.upper || !profile?.video) {
    return [error('INVALID_PROFILE', 'Структура профілю пошкоджена.')];
  }

  const errors = [
    ...validateRange(profile.control.lower),
    ...validateRange(profile.control.upper),
    ...validateCatalog(profile.video.catalog),
    ...validateRepeater(profile.repeater)
  ];
  const duplicate = findDuplicateAssignment(profile.video.matrix);
  if (duplicate) {
    errors.push(error('DUPLICATE_VIDEO', 'Відеочастота повторюється.', duplicate));
  }
  return errors;
};
