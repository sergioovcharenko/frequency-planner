const deepFreeze = (value) => {
  Object.freeze(value);
  Object.values(value).forEach((entry) => {
    if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) {
      deepFreeze(entry);
    }
  });
  return value;
};

export const FACTORY_PROFILE = deepFreeze({
  schemaVersion: 1,
  name: 'Штатний профіль',
  control: {
    lower: {
      min: 410,
      max: 485,
      start: 410,
      end: 485,
      polarization: 'H',
      hopsPerSecond: 30
    },
    upper: {
      min: 820,
      max: 895,
      start: 820,
      end: 895,
      polarization: 'V',
      hopsPerSecond: 30
    }
  },
  video: {
    groups: ['5.2', '5.5', '5.8'],
    matrix: [
      [5180, 5240, 5300],
      [5520, 5580, 5640],
      [5700, 5765, 5825]
    ],
    catalog: [
      5180, 5200, 5220, 5240, 5260, 5280, 5300, 5320, 5500,
      5520, 5540, 5560, 5580, 5600, 5620, 5640, 5660, 5680
    ]
  }
});

export const cloneFactoryProfile = () => structuredClone(FACTORY_PROFILE);
