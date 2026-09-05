const deepFreeze = (value) => {
  Object.freeze(value);
  Object.values(value).forEach((entry) => {
    if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) deepFreeze(entry);
  });
  return value;
};

const range = (id, label, start, end) => ({ id, label, start, end, precision: 'exact' });
const nominal = (id, label, frequency) => ({ id, label, start: frequency, end: frequency, precision: 'nominal' });

export const REPEATER_MODELS = deepFreeze([
  {
    id: 'tactech-mavic',
    name: 'Tactical Technology — Repeater on Mavic',
    sourceUrl: 'https://www.tactech.world/en/products/communication-and-control/repeater',
    channels: {
      controlTx: [
        range('control-433-520', '433–520 МГц', 433, 520),
        range('control-720-1020', '720–1020 МГц', 720, 1020),
        range('control-2100-2700', '2100–2700 МГц', 2100, 2700)
      ],
      videoRx: [
        nominal('rx-5800', '5.8 ГГц', 5800),
        nominal('rx-6500', '6.5 ГГц', 6500),
        nominal('rx-7500', '7.5 ГГц', 7500)
      ],
      videoTx: [
        nominal('tx-1200', '1.2 ГГц', 1200),
        nominal('tx-3300', '3.3 ГГц', 3300)
      ]
    }
  },
  {
    id: 'vishchun-5-8',
    name: 'BlueBird Tech — Віщун-5.8',
    sourceUrl: 'https://www.blue-bird.tech/en/products/wireless-retranslator-blue-bird-repeater/',
    channels: {
      controlTx: [],
      videoRx: [range('rx-4990-5945', '4990–5945 МГц', 4990, 5945)],
      videoTx: [
        nominal('tx-1200', '1.2 ГГц', 1200),
        nominal('tx-1300', '1.3 ГГц', 1300)
      ]
    }
  }
]);

export const getRepeaterModel = (modelId) =>
  REPEATER_MODELS.find(({ id }) => id === modelId) ?? null;

const namedTransmitter = (channel, name) => channel ? { ...channel, name } : null;

export const resolveRepeater = (config = {}) => {
  if (config.modelId === 'custom') {
    const ranges = Array.isArray(config.customRanges) ? config.customRanges : [];
    const videoRx = ranges.find(({ direction, purpose }) => direction === 'rx' && purpose === 'video') ?? null;
    const transmitters = ranges
      .filter(({ direction }) => direction === 'tx')
      .map((channel) => namedTransmitter(channel, channel.label || 'Передавач ретранслятора'));
    const missing = [];
    if (!videoRx) missing.push('діапазон приймання відео');
    if (!transmitters.some(({ purpose }) => purpose === 'video')) missing.push('частота передавання відео');
    if (!transmitters.some(({ purpose }) => purpose === 'control')) missing.push('частота керування');
    return {
      id: 'custom',
      name: config.customName || 'Інша модель',
      sourceUrl: '',
      videoRx,
      transmitters,
      missing
    };
  }

  const model = getRepeaterModel(config.modelId);
  if (!model) {
    return {
      id: null,
      name: 'Ретранслятор не вибрано',
      sourceUrl: '',
      videoRx: null,
      transmitters: [],
      missing: ['модель ретранслятора', 'діапазон приймання відео', 'частота передавання відео', 'частота керування']
    };
  }

  const selections = config.selections ?? {};
  const selected = (group, id) => model.channels[group].find((channel) => channel.id === id) ?? null;
  const videoRx = selected('videoRx', selections.videoRx);
  const videoTx = selected('videoTx', selections.videoTx);
  const controlTx = selected('controlTx', selections.controlTx);
  const transmitters = [
    namedTransmitter(videoTx, 'Передавання відео ретранслятора'),
    namedTransmitter(controlTx, 'Передавання керування ретранслятора')
  ].filter(Boolean);
  const missing = [];
  if (!videoRx) missing.push('діапазон приймання відео');
  else if (videoRx.precision === 'nominal') missing.push('точні межі приймання відео');
  if (!videoTx) missing.push('частота передавання відео');
  else if (videoTx.precision === 'nominal') missing.push('точна частота передавання відео');
  if (!controlTx) missing.push('частота керування');

  return { id: model.id, name: model.name, sourceUrl: model.sourceUrl, videoRx, transmitters, missing };
};
