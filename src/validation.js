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

export const validateProfile = (profile) => {
  if (!profile?.control?.lower || !profile?.control?.upper || !profile?.video) {
    return [error('INVALID_PROFILE', 'Структура профілю пошкоджена.')];
  }

  const errors = [
    ...validateRange(profile.control.lower),
    ...validateRange(profile.control.upper),
    ...validateCatalog(profile.video.catalog)
  ];
  const duplicate = findDuplicateAssignment(profile.video.matrix);
  if (duplicate) {
    errors.push(error('DUPLICATE_VIDEO', 'Відеочастота повторюється.', duplicate));
  }
  return errors;
};
