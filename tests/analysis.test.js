import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeFrequency, analyzeMatrix, analyzeVideoCompatibility, rankRecommendations } from '../src/analysis.js';
import { cloneFactoryProfile } from '../src/profiles.js';
import { resolveRepeater } from '../src/repeaters.js';

test('direct occupied-range overlap is dangerous', () => {
  const result = analyzeFrequency(5580, {
    occupiedRanges: [{ start: 5575, end: 5585, name: 'Ретрік' }],
    controlRanges: []
  });

  assert.equal(result.level, 'danger');
  assert.match(result.reasons[0], /перекриває/i);
});

test('a channel 11 to 27 MHz from an occupied range needs caution', () => {
  const result = analyzeFrequency(5580, {
    occupiedRanges: [{ start: 5550, end: 5555, name: 'Ретрік' }],
    controlRanges: []
  });

  assert.equal(result.level, 'watch');
  assert.equal(result.marginMHz, 25);
});

test('mathematical harmonic match is reported as possible interference', () => {
  const result = analyzeFrequency(5180, {
    occupiedRanges: [],
    controlRanges: [{ start: 820, end: 895, name: 'Верхній' }]
  });

  assert.equal(result.level, 'risk');
  assert.match(result.reasons.join(' '), /6-ї гармоніки/i);
  assert.match(result.reasons.join(' '), /розрахункова можливість/i);
});

test('broad FHSS harmonic bands are advisory and do not hide a compatible channel', () => {
  const result = analyzeFrequency(5180, {
    occupiedRanges: [],
    controlRanges: [],
    advisoryRanges: [{ start: 820, end: 895, name: 'Верхній діапазон ППРЧ' }]
  });

  assert.equal(result.level, 'good');
  assert.match(result.reasons.join(' '), /6-ї гармоніки/i);
  assert.match(result.reasons.join(' '), /потребує вимірювання/i);
});

test('missing comparison data never returns a safe status', () => {
  assert.equal(analyzeFrequency(5700, { occupiedRanges: [], controlRanges: [] }).level, 'unknown');
});

test('matrix analysis reports all nine positions and sorts lower severity first', () => {
  const profile = cloneFactoryProfile();
  const results = analyzeMatrix(profile, {
    occupiedRanges: [{ start: 5575, end: 5585, name: 'Ретрік' }]
  });
  const ranked = rankRecommendations(results);

  assert.equal(results.length, 9);
  assert.equal(results.find((item) => item.frequency === 5580).level, 'danger');
  assert.notEqual(ranked[0].level, 'danger');
  assert.equal(ranked.at(-1).level, 'danger');
});

test('exact RX range marks an in-range video channel compatible', () => {
  assert.deepEqual(analyzeVideoCompatibility(5825, {
    start: 4990,
    end: 5945,
    precision: 'exact'
  }), {
    level: 'good',
    label: 'Сумісний із RX',
    reason: '5825 МГц входить у діапазон приймання 4990–5945 МГц.'
  });
});

test('exact RX range rejects an out-of-range video channel', () => {
  const result = analyzeVideoCompatibility(5825, {
    start: 6000,
    end: 6100,
    precision: 'exact'
  });
  assert.equal(result.level, 'danger');
  assert.equal(result.label, 'Несумісний із RX');
});

test('nominal RX needs clarification instead of reporting safe', () => {
  const result = analyzeVideoCompatibility(5825, {
    start: 5800,
    end: 5800,
    precision: 'nominal',
    label: '5.8 ГГц'
  });
  assert.equal(result.level, 'unknown');
  assert.equal(result.label, 'Потрібне уточнення');
});

test('RX range does not create direct interference', () => {
  const profile = cloneFactoryProfile();
  const results = analyzeMatrix(profile, {
    videoRx: { start: 4990, end: 5945, precision: 'exact' },
    transmitters: [],
    missing: []
  });
  assert.notEqual(results.find(({ frequency }) => frequency === 5580).level, 'danger');
});

test('selected repeater TX participates in conflict analysis', () => {
  const profile = cloneFactoryProfile();
  const results = analyzeMatrix(profile, {
    videoRx: { start: 4990, end: 5945, precision: 'exact' },
    transmitters: [{ start: 5575, end: 5585, name: 'Передавання ретранслятора' }],
    missing: []
  });
  assert.equal(results.find(({ frequency }) => frequency === 5580).level, 'danger');
});

test('missing repeater data prevents a safe status', () => {
  const profile = cloneFactoryProfile();
  profile.control.lower.start = 410;
  profile.control.lower.end = 411;
  profile.control.upper.start = 820;
  profile.control.upper.end = 821;
  const result = analyzeMatrix(profile, {
    videoRx: null,
    transmitters: [],
    missing: ['діапазон приймання відео']
  })[0];
  assert.equal(result.level, 'unknown');
  assert.match(result.reasons.join(' '), /бракує даних/i);
});

test('nominal repeater TX stays a warning when exact RX is compatible', () => {
  const profile = cloneFactoryProfile();
  profile.video.matrix[0][0] = 1200;
  profile.control.lower.start = 410;
  profile.control.lower.end = 411;
  profile.control.upper.start = 820;
  profile.control.upper.end = 821;
  const result = analyzeMatrix(profile, {
    videoRx: { start: 1000, end: 1300, precision: 'exact' },
    transmitters: [{ start: 1200, end: 1200, precision: 'nominal', name: 'Номінальний TX' }],
    missing: ['точна частота передавання відео']
  })[0];
  assert.notEqual(result.level, 'danger');
  assert.equal(result.level, 'good');
  assert.match(result.reasons.join(' '), /Бракує даних/i);
});

test('exact repeater TX harmonics are included in video risk analysis', () => {
  const profile = cloneFactoryProfile();
  profile.video.matrix[0][0] = 5000;
  profile.control.lower.start = 410;
  profile.control.lower.end = 411;
  profile.control.upper.start = 820;
  profile.control.upper.end = 821;
  const result = analyzeMatrix(profile, {
    videoRx: { start: 4900, end: 6000, precision: 'exact' },
    transmitters: [{ start: 1000, end: 1000, precision: 'exact', name: 'TX ретранслятора' }],
    missing: []
  })[0];
  assert.equal(result.level, 'risk');
  assert.match(result.reasons.join(' '), /5-ї гармоніки \(TX ретранслятора\)/i);
});

test('Vishchun channels inside exact RX stay green when only FHSS harmonics and incomplete TX data remain', () => {
  const profile = cloneFactoryProfile();
  const repeater = resolveRepeater({
    modelId: 'vishchun-5-8',
    selections: {
      videoRx: 'rx-4990-5945',
      videoTx: 'tx-1300',
      controlTx: null
    }
  });

  const results = analyzeMatrix(profile, repeater);

  assert.equal(results.length, 9);
  assert.ok(results.every(({ level }) => level === 'good'));
  assert.ok(results.every(({ label }) => label === 'Сумісний із RX'));
  assert.match(results[0].reasons.join(' '), /Бракує даних/i);
});
