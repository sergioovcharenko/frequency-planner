import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeFrequency, analyzeMatrix, rankRecommendations } from '../src/analysis.js';
import { cloneFactoryProfile } from '../src/profiles.js';

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
