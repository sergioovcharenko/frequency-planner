const LEVELS = {
  good: { score: 0, label: 'Підходить' },
  watch: { score: 1, label: 'Обережно' },
  risk: { score: 2, label: 'Можлива завада' },
  danger: { score: 3, label: 'Небезпечно' },
  unknown: { score: 4, label: 'Не перевірено' }
};

const distanceToRange = (frequency, range) => {
  if (frequency < range.start) return range.start - frequency;
  if (frequency > range.end) return frequency - range.end;
  return 0;
};

const harmonicMatches = (frequency, controlRanges) => {
  const matches = [];
  for (const range of controlRanges) {
    for (let order = 2; order <= 15; order += 1) {
      if (frequency >= order * range.start && frequency <= order * range.end) {
        matches.push({ order, name: range.name ?? 'Діапазон керування' });
        break;
      }
    }
  }
  return matches;
};

export const analyzeFrequency = (frequency, context = {}) => {
  const occupiedRanges = Array.isArray(context.occupiedRanges) ? context.occupiedRanges : [];
  const controlRanges = Array.isArray(context.controlRanges) ? context.controlRanges : [];
  if (!occupiedRanges.length && !controlRanges.length) {
    return {
      frequency,
      level: 'unknown',
      label: LEVELS.unknown.label,
      marginMHz: null,
      reasons: ['Недостатньо даних для порівняння.']
    };
  }

  let level = 'good';
  let marginMHz = null;
  const reasons = [];

  if (occupiedRanges.length) {
    marginMHz = Math.min(...occupiedRanges.map((range) => distanceToRange(frequency, range)));
    if (marginMHz === 0) {
      level = 'danger';
      reasons.push('Відеочастота перекриває зайнятий діапазон іншого передавача.');
    } else if (marginMHz <= 10) {
      level = 'danger';
      reasons.push(`Запас до зайнятого діапазону лише ${marginMHz} МГц.`);
    } else if (marginMHz <= 27) {
      level = 'watch';
      reasons.push(`Запас до зайнятого діапазону ${marginMHz} МГц — потрібна обережність.`);
    } else {
      reasons.push(`Запас до найближчого зайнятого діапазону ${marginMHz} МГц.`);
    }
  }

  const harmonics = harmonicMatches(frequency, controlRanges);
  if (harmonics.length) {
    if (LEVELS[level].score < LEVELS.risk.score) level = 'risk';
    for (const match of harmonics) {
      reasons.push(`${frequency} МГц потрапляє в інтервал ${match.order}-ї гармоніки (${match.name}); це розрахункова можливість, а не підтверджена завада.`);
    }
  }

  if (!reasons.length) reasons.push('За заданими правилами суттєвого конфлікту не знайдено.');

  return { frequency, level, label: LEVELS[level].label, marginMHz, reasons };
};

export const analyzeMatrix = (profile, repeater = {}) => {
  const controlRanges = [
    { ...profile.control.lower, name: 'Нижній діапазон' },
    { ...profile.control.upper, name: 'Верхній діапазон' }
  ];
  return profile.video.matrix.flatMap((row, groupIndex) =>
    row.map((frequency, channelIndex) => ({
      ...analyzeFrequency(frequency, {
        occupiedRanges: repeater.occupiedRanges ?? [],
        controlRanges
      }),
      group: profile.video.groups[groupIndex],
      channel: channelIndex + 1
    }))
  );
};

export const rankRecommendations = (results) => [...results].sort((left, right) => {
  const severity = LEVELS[left.level].score - LEVELS[right.level].score;
  if (severity !== 0) return severity;
  return (right.marginMHz ?? -1) - (left.marginMHz ?? -1) || left.frequency - right.frequency;
});
