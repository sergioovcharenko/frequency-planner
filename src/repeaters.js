const deepFreeze = (value) => {
  Object.freeze(value);
  Object.values(value).forEach((entry) => {
    if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) deepFreeze(entry);
  });
  return value;
};

const range = (id, label, start, end) => ({ id, label, start, end, precision: 'exact' });
const nominal = (id, label, frequency) => ({ id, label, start: frequency, end: frequency, precision: 'nominal' });
const nominalRange = (id, label, start, end) => ({ id, label, start, end, precision: 'nominal' });

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
  },
  {
    id: 'urs-ar-v2',
    name: 'URS — AR-V2 (модульний)',
    sourceUrl: 'https://uarobo.com/blog/modulniy-retranslator-fpv-kvardrokopteriv-ar-v2/',
    channels: {
      controlTx: [
        nominalRange('control-433-500', '433–500 МГц', 433, 500),
        nominalRange('control-740-790', '740–790 МГц', 740, 790),
        nominalRange('control-868-915', '868–915 МГц', 868, 915),
        nominalRange('control-915-1000', '915–1000 МГц', 915, 1000)
      ],
      videoRx: [
        range('rx-4990-5945', '4990–5945 МГц', 4990, 5945),
        range('rx-6100-7200', '6100–7200 МГц', 6100, 7200)
      ],
      videoTx: [
        nominalRange('tx-1060-1380', '1.06–1.38 ГГц', 1060, 1380),
        nominalRange('tx-5645-5945', '5.645–5.945 ГГц', 5645, 5945)
      ]
    }
  },
  {
    id: 'toro-puta-maxi',
    name: 'TORO — PUTA MAXI',
    sourceUrl: 'https://toro-ukraine.com/',
    channels: {
      controlTx: [
        nominal('control-500', '500 МГц', 500),
        nominal('control-750', '750 МГц', 750),
        nominal('control-950', '950 МГц', 950),
        nominalRange('control-1700-2700', '1.7–2.7 ГГц', 1700, 2700)
      ],
      videoRx: [4000, 5800, 6700, 7800, 8900].map((frequency) =>
        nominal(`rx-${frequency}`, `${frequency / 1000} ГГц`, frequency)
      ),
      videoTx: [1200, 3300, 5800].map((frequency) =>
        nominal(`tx-${frequency}`, `${frequency / 1000} ГГц`, frequency)
      )
    }
  },
  {
    id: 'brave-urs-ar-v2-61-72',
    name: 'BRAVE1 — URS AR-V2 6.1–7.2 ГГц',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/9100/',
    channels: {
      controlTx: [],
      videoRx: [range('rx-6100-7200', '6.1–7.2 ГГц', 6100, 7200)],
      videoTx: []
    }
  },
  {
    id: 'brave-eho-lite-75',
    name: 'BRAVE1 — EHO Lite 7.5',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/8389/',
    channels: {
      controlTx: [],
      videoRx: [nominal('rx-7500', '7.5 ГГц', 7500)],
      videoTx: []
    }
  },
  {
    id: 'brave-skybridge',
    name: 'BRAVE1 — SkyBridge',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/7896/',
    channels: {
      controlTx: [nominal('control-433', '433 МГц', 433)],
      videoRx: [nominal('rx-1200', '1.2 ГГц', 1200)],
      videoTx: [nominal('tx-5800', '5.8 ГГц', 5800)]
    }
  },
  {
    id: 'brave-urs-ar-c-v1',
    name: 'BRAVE1 — URS AR-C-V1 Coalas Edition',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/7731/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
  },
  {
    id: 'brave-echo',
    name: 'BRAVE1 — «Ехо» від Зграя Індастріз',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/7515/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
  },
  {
    id: 'brave-donbas',
    name: 'BRAVE1 — DONBAS REPEATER',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/7048/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
  },
  {
    id: 'brave-nebokrai-49-61',
    name: 'BRAVE1 — Небокрай 4.9–6.1 → 1.3/3.3 ГГц',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5961/',
    channels: {
      controlTx: [],
      videoRx: [range('rx-4900-6100', '4.9–6.1 ГГц', 4900, 6100)],
      videoTx: [
        nominal('tx-1300', '1.3 ГГц', 1300),
        nominal('tx-3300', '3.3 ГГц', 3300)
      ]
    }
  },
  {
    id: 'brave-4pm-33-58',
    name: 'BRAVE1 — 4PM Relay 3.3/5.8',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5016/',
    channels: {
      controlTx: [],
      videoRx: [nominal('rx-3300', '3.3 ГГц', 3300), nominal('rx-5800', '5.8 ГГц', 5800)],
      videoTx: [nominal('tx-3300', '3.3 ГГц', 3300), nominal('tx-5800', '5.8 ГГц', 5800)]
    }
  },
  {
    id: 'brave-4pm-58-67',
    name: 'BRAVE1 — 4PM Relay 5.8/6.7',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5008/',
    channels: {
      controlTx: [],
      videoRx: [nominal('rx-5800', '5.8 ГГц', 5800), nominal('rx-6700', '6.7 ГГц', 6700)],
      videoTx: [nominal('tx-5800', '5.8 ГГц', 5800), nominal('tx-6700', '6.7 ГГц', 6700)]
    }
  },
  {
    id: 'brave-4pm-58-45',
    name: 'BRAVE1 — 4PM Relay 5.8/4.5',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5006/',
    channels: {
      controlTx: [],
      videoRx: [nominal('rx-5800', '5.8 ГГц', 5800), nominal('rx-4500', '4.5 ГГц', 4500)],
      videoTx: [nominal('tx-5800', '5.8 ГГц', 5800), nominal('tx-4500', '4.5 ГГц', 4500)]
    }
  },
  {
    id: 'brave-k4rm4',
    name: 'BRAVE1 — K4RM4',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/9291/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
  },
  {
    id: 'brave-sine-link-video',
    name: 'BRAVE1 — Sine.Link + Sine.Video',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/9137/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
  },
  {
    id: 'brave-lanker',
    name: 'BRAVE1 — «Ланкер» від Зграя Індастріз',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/7517/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
  },
  {
    id: 'brave-air-repeater',
    name: 'BRAVE1 — Повітряний ретранслятор для FPV',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/6170/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
  },
  {
    id: 'brave-nebokrai-digital',
    name: 'BRAVE1 — Небокрай цифровий Walksnail',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5956/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
  },
  {
    id: 'brave-vishchun-p',
    name: 'BRAVE1 — «Віщун-П» від BlueBird Tech',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5928/',
    channels: {
      controlTx: [
        nominal('control-868', '868 МГц', 868),
        nominal('control-915', '915 МГц', 915),
        nominal('control-2400', '2.4 ГГц', 2400)
      ],
      videoRx: [range('rx-4990-5945', '4990–5945 МГц', 4990, 5945)],
      videoTx: [nominal('tx-1200', '1.2 ГГц', 1200), nominal('tx-1300', '1.3 ГГц', 1300)]
    }
  },
  {
    id: 'brave-nebokrai-33-58',
    name: 'BRAVE1 — Небокрай 3.3 → 5.8 ГГц',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5849/',
    channels: {
      controlTx: [],
      videoRx: [nominal('rx-3300', '3.3 ГГц', 3300)],
      videoTx: [nominal('tx-5800', '5.8 ГГц', 5800)]
    }
  },
  {
    id: 'brave-fpv-matrice-30',
    name: 'BRAVE1 — FPV ретранслятор для DJI Matrice 30',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5419/',
    channels: {
      controlTx: [nominalRange('control-100-2600', '100–2600 МГц', 100, 2600)],
      videoRx: [
        nominal('rx-1200', '1.2 ГГц', 1200),
        nominal('rx-3300', '3.3 ГГц', 3300),
        nominal('rx-5800', '5.8 ГГц', 5800),
        nominalRange('rx-6000-7200', '6.0–7.2 ГГц', 6000, 7200)
      ],
      videoTx: [
        nominal('tx-1200', '1.2 ГГц', 1200),
        nominal('tx-3300', '3.3 ГГц', 3300),
        nominal('tx-5800', '5.8 ГГц', 5800),
        nominalRange('tx-6000-7200', '6.0–7.2 ГГц', 6000, 7200)
      ]
    }
  },
  {
    id: 'brave-phantom-18',
    name: 'BRAVE1 — Phantom 18 Repeater',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5173/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
  },
  {
    id: 'brave-rz-m',
    name: 'BRAVE1 — Репітер зв’язку РЗ-М',
    sourceUrl: 'https://market-brave1.delta.mil.gov.ua/retransliatory/5096/',
    channels: { controlTx: [], videoRx: [], videoTx: [] }
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
