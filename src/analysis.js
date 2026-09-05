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
  const advisoryRanges = Array.isArray(context.advisoryRanges) ? context.advisoryRanges : [];
  if (!occupiedRanges.length && !controlRanges.length && !advisoryRanges.length) {
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

  for (const match of harmonicMatches(frequency, advisoryRanges)) {
    reasons.push(`${frequency} МГц потрапляє в інтервал ${match.order}-ї гармоніки (${match.name}); це теоретичне попередження, яке потребує вимірювання спектроаналізатором.`);
  }

  if (!reasons.length) reasons.push('За заданими правилами суттєвого конфлікту не знайдено.');

  return { frequency, level, label: LEVELS[level].label, marginMHz, reasons };
};

export const analyzeVideoCompatibility = (frequency, rx) => {
  if (!rx) {
    return {
      level: 'unknown',
      label: 'Потрібне уточнення',
      reason: 'Не вказано діапазон приймання відео ретранслятора.'
    };
  }
  if (rx.precision !== 'exact') {
    return {
      level: 'unknown',
      label: 'Потрібне уточнення',
      reason: `${rx.label ?? `${rx.start} МГц`} — номінальне позначення без точних меж приймання.`
    };
  }
  if (frequency >= rx.start && frequency <= rx.end) {
    return {
      level: 'good',
      label: 'Сумісний із RX',
      reason: `${frequency} МГц входить у діапазон приймання ${rx.start}–${rx.end} МГц.`
    };
  }
  return {
    level: 'danger',
    label: 'Несумісний із RX',
    reason: `${frequency} МГц не входить у діапазон приймання ${rx.start}–${rx.end} МГц.`
  };
};

const mergeResults = (interference, compatibility, missing) => {
  let level = interference.level;
  let label = interference.label;

  if (compatibility.level === 'danger') {
    level = 'danger';
    label = compatibility.label;
  } else if (level === 'good' && compatibility.level === 'unknown') {
    level = 'unknown';
    label = compatibility.label;
  } else if (level === 'good' && compatibility.level === 'good') {
    label = compatibility.label;
  }

  const reasons = [...new Set([...interference.reasons, compatibility.reason])];
  if (missing.length) {
    reasons.push(`Бракує даних: ${missing.join(', ')}.`);
    if (level === 'good' && compatibility.level !== 'good') {
      level = 'unknown';
      label = 'Потрібне уточнення';
    }
  }

  return { ...interference, level, label, reasons };
};

export const analyzeMatrix = (profile, repeater = {}) => {
  const controlRanges = [
    { ...profile.control.lower, name: 'Нижній діапазон' },
    { ...profile.control.upper, name: 'Верхній діапазон' }
  ];
  const transmitters = repeater.transmitters ?? repeater.occupiedRanges ?? [];
  const exactTransmitters = transmitters.filter(({ precision }) => precision !== 'nominal');
  const occupiedRanges = exactTransmitters;
  const hasCompatibilityContext = Object.hasOwn(repeater, 'videoRx') || Object.hasOwn(repeater, 'missing');
  const missing = Array.isArray(repeater.missing) ? repeater.missing : [];
  return profile.video.matrix.flatMap((row, groupIndex) => row.map((frequency, channelIndex) => {
    const interference = analyzeFrequency(frequency, {
      occupiedRanges,
      controlRanges: exactTransmitters,
      advisoryRanges: controlRanges
    });
    const result = hasCompatibilityContext
      ? mergeResults(interference, analyzeVideoCompatibility(frequency, repeater.videoRx ?? null), missing)
      : interference;
    return {
      ...result,
      group: profile.video.groups[groupIndex],
      channel: channelIndex + 1
    };
  }));
};

export const rankRecommendations = (results) => [...results].sort((left, right) => {
  const severity = LEVELS[left.level].score - LEVELS[right.level].score;
  if (severity !== 0) return severity;
  return (right.marginMHz ?? -1) - (left.marginMHz ?? -1) || left.frequency - right.frequency;
});
