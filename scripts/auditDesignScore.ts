import assert from 'node:assert/strict';
import { analyzeDesignSupport } from '../services/designFeedbackService';
import {
  calculateDesignScore,
  calculateScoreMetrics,
  DESIGN_SCORE_THRESHOLDS,
} from '../src/research/metrics/designScore';
import { EmojiConfig } from '../types';

const baseConfig: EmojiConfig = {
  textTop: 'あり',
  textBottom: 'がと',
  lineSizeBalance: 0,
  fontFamily: "'LINE Seed JP', sans-serif",
  fontWeight: 700,
  condense: 100,
  letterSpacing: 0,
  mainColor: '#FFCC00',
  textAlign: 'center',
  stroke1Enabled: true,
  stroke1Color: '#000000',
  stroke1Width: 4,
  stroke2Enabled: true,
  stroke2Color: '#FFFFFF',
  stroke2Width: 10,
  autoSquare: false,
  spacing: -50,
};

const score = (overrides: Partial<EmojiConfig> = {}) =>
  calculateDesignScore({ ...baseConfig, ...overrides });

const cases: Array<Record<string, string | number>> = [];
const record = (name: string, result: ReturnType<typeof calculateDesignScore>) => {
  const dominantPenalties = Object.entries(result.scalabilityPenalties)
    .filter(([key, value]) => key !== 'total' && value > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
  cases.push({
    case: name,
    total: result.total,
    lc: result.displayedContrastLc,
    scalability: result.scalabilityScore,
    penalty: result.scalabilityPenalties.total,
    dominant: dominantPenalties,
  });
};

const defaultResult = score();
record('default', defaultResult);
assert.ok(defaultResult.total >= 80, 'Default configuration should remain in the Good band');
assert.ok(defaultResult.displayedContrastLc >= 75);
assert.ok(defaultResult.scalabilityScore >= 82);

const emptyResult = score({ textTop: '', textBottom: '   ' });
record('empty', emptyResult);
assert.equal(emptyResult.scalabilityScore, 0);
assert.equal(emptyResult.displayedContrastLc, 0);
assert.equal(emptyResult.total, 0);
const emptyFeedback = await analyzeDesignSupport('', { ...baseConfig, textTop: '', textBottom: '' }, 'jp', {
  ...calculateScoreMetrics({ ...baseConfig, textTop: '', textBottom: '' }),
});
assert.match(emptyFeedback.tip, /文字が入力されていません/);

const graphemeResult = score({ textTop: '👨‍👩‍👧‍👦', textBottom: 'は\u3099' });
assert.equal(
  graphemeResult.characterComplexity.characterCount,
  2,
  'ZWJ sequences and combining marks must be counted as grapheme clusters',
);

const disabledA = score({
  stroke1Enabled: false,
  stroke1Color: '#FFFFFF',
  stroke1Width: 30,
  stroke2Enabled: false,
  stroke2Color: '#FFFFFF',
  stroke2Width: 30,
});
const disabledB = score({
  stroke1Enabled: false,
  stroke1Color: '#123456',
  stroke1Width: 0,
  stroke2Enabled: false,
  stroke2Color: '#ABCDEF',
  stroke2Width: 0,
});
record('strokes-disabled', disabledA);
assert.equal(disabledA.total, disabledB.total, 'Disabled stroke parameters must not affect total score');
assert.equal(disabledA.scalabilityScore, disabledB.scalabilityScore);
assert.equal(disabledA.displayedContrastLc, disabledB.displayedContrastLc);

const brightWithoutInner = score({
  mainColor: '#FFCC00',
  stroke1Enabled: false,
  stroke2Enabled: false,
});
const darkWithoutInner = score({
  mainColor: '#386CB0',
  stroke1Enabled: false,
  stroke2Enabled: false,
});
assert.equal(
  brightWithoutInner.scalabilityScore,
  darkWithoutInner.scalabilityScore,
  'A color-contrast deficit must not be deducted again from Scalability',
);

const widths = [100, 90, 85, 80, 60].map((condense) => score({ condense, textTop: '確認', textBottom: '中' }));
widths.forEach((result, index) => record(`width-${[100, 90, 85, 80, 60][index]}`, result));
assert.equal(widths[0].scalabilityPenalties.widthTransform, 0);
assert.equal(widths[1].scalabilityPenalties.widthTransform, 0);
assert.ok(widths[2].scalabilityPenalties.widthTransform > 0);
assert.ok(widths[4].scalabilityPenalties.widthTransform >= widths[3].scalabilityPenalties.widthTransform);

const dense = score({
  textTop: '魑魅',
  textBottom: '魍魎',
  fontWeight: 900,
  stroke1Width: 8,
  condense: 80,
});
const denseImproved = score({
  textTop: '魑魅',
  textBottom: '魍魎',
  fontWeight: 700,
  stroke1Width: 4,
  condense: 100,
});
record('dense-kanji', dense);
record('dense-kanji-adjusted', denseImproved);
assert.ok(denseImproved.scalabilityScore > dense.scalabilityScore);
const denseFeedback = await analyzeDesignSupport('魑魅魍魎', { ...baseConfig, textTop: '魑魅', textBottom: '魍魎', fontWeight: 900, stroke1Width: 8, condense: 80 }, 'jp', {
  ...calculateScoreMetrics({ ...baseConfig, textTop: '魑魅', textBottom: '魍魎', fontWeight: 900, stroke1Width: 8, condense: 80 }),
});
assert.match(denseFeedback.tip, /画数|内側線|太さ/);

const poorContrast = score({
  mainColor: '#FFFFFF',
  stroke1Enabled: false,
  stroke2Enabled: false,
});
record('poor-contrast', poorContrast);
assert.ok(poorContrast.displayedContrastLc < 60);
assert.ok(poorContrast.total <= 69);
const contrastImproved = score({
  mainColor: '#FFFFFF',
  stroke1Enabled: true,
  stroke1Color: '#000000',
  stroke1Width: 4,
  stroke2Enabled: true,
  stroke2Color: '#FFFFFF',
  stroke2Width: 10,
});
assert.ok(
  contrastImproved.total > poorContrast.total,
  'Adding effective contrasting boundaries should improve the low-contrast case',
);

const mergedSameColorLayers = score({
  mainColor: '#000000',
  stroke1Enabled: true,
  stroke1Color: '#000000',
  stroke1Width: 4,
  stroke2Enabled: true,
  stroke2Color: '#FFFFFF',
  stroke2Width: 10,
});
assert.ok(
  mergedSameColorLayers.displayedContrastLc >= DESIGN_SCORE_THRESHOLDS.contrastAcceptable,
  'Same-color fill and inner stroke must merge instead of creating a false Lc 0 failure',
);
const contrastFeedback = await analyzeDesignSupport('ありがと', { ...baseConfig, mainColor: '#FFFFFF', stroke1Enabled: false, stroke2Enabled: false }, 'jp', {
  ...calculateScoreMetrics({ ...baseConfig, mainColor: '#FFFFFF', stroke1Enabled: false, stroke2Enabled: false }),
});
assert.match(contrastFeedback.tip, /色差|背景|コントラスト|内側線|外側線/);

const noFit = score({ textTop: '確認', textBottom: 'よろしく', autoSquare: false });
const withFit = score({ textTop: '確認', textBottom: 'よろしく', autoSquare: true });
record('width-fit-off', noFit);
record('width-fit-on', withFit);
assert.ok(withFit.geometry.lineBalanceRisk <= noFit.geometry.lineBalanceRisk);
assert.ok(withFit.scalabilityPenalties.widthTransform >= 0);

const stableOuter = score({ stroke2Enabled: true, stroke2Width: 10 });
const thinOuter = score({ stroke2Enabled: true, stroke2Width: 3 });
const heavyOuter = score({ stroke2Enabled: true, stroke2Width: 25 });
record('outer-10', stableOuter);
record('outer-3', thinOuter);
record('outer-25', heavyOuter);
assert.equal(stableOuter.scalabilityPenalties.outerStroke, 0);
assert.ok(thinOuter.scalabilityPenalties.outerStroke > 0);
assert.ok(heavyOuter.scalabilityPenalties.outerStroke > 0);
assert.ok(stableOuter.total > thinOuter.total);
assert.ok(stableOuter.total > heavyOuter.total);

const heavyInner = score({ textTop: '鬱', textBottom: '病', stroke1Width: 12 });
const lighterInner = score({ textTop: '鬱', textBottom: '病', stroke1Width: 4 });
assert.ok(
  lighterInner.scalabilityScore > heavyInner.scalabilityScore,
  'Reducing an excessive inner stroke should improve dense text scalability',
);

const extremeSpacing = score({ letterSpacing: -20, spacing: -130 });
const neutralSpacing = score({ letterSpacing: 0, spacing: -50 });
assert.ok(
  neutralSpacing.scalabilityScore > extremeSpacing.scalabilityScore,
  'Returning extreme spacing toward the default should improve Scalability',
);

const colors = ['#FFFFFF', '#FFCC00', '#FF9914', '#386CB0', '#1D1C1D'];
const texts = [
  ['OK', ''],
  ['確認', '中'],
  ['魑魅', '魍魎'],
];
const weights = [300, 700, 900];
const condenses = [60, 85, 100, 120, 140];
const strokeModes = [
  { stroke1Enabled: false, stroke2Enabled: false },
  { stroke1Enabled: true, stroke1Width: 4, stroke2Enabled: false },
  { stroke1Enabled: false, stroke2Enabled: true, stroke2Width: 10 },
  { stroke1Enabled: true, stroke1Width: 4, stroke2Enabled: true, stroke2Width: 10 },
  { stroke1Enabled: true, stroke1Width: 12, stroke2Enabled: true, stroke2Width: 25 },
];

let matrixCount = 0;
for (const mainColor of colors) {
  for (const [textTop, textBottom] of texts) {
    for (const fontWeight of weights) {
      for (const condense of condenses) {
        for (const strokeMode of strokeModes) {
          const config = { ...baseConfig, mainColor, textTop, textBottom, fontWeight, condense, ...strokeMode };
          const result = calculateDesignScore(config);
          matrixCount += 1;
          assert.ok(result.total >= 0 && result.total <= 100);
          assert.ok(result.scalabilityScore >= 0 && result.scalabilityScore <= 100);
          if (
            result.displayedContrastLc < DESIGN_SCORE_THRESHOLDS.contrastAcceptable ||
            result.scalabilityScore < DESIGN_SCORE_THRESHOLDS.scalabilityAcceptable
          ) {
            assert.ok(
              result.total < DESIGN_SCORE_THRESHOLDS.totalAcceptable,
              'A red component must prevent a green/yellow total',
            );
          } else if (
            result.displayedContrastLc < DESIGN_SCORE_THRESHOLDS.contrastGood ||
            result.scalabilityScore < DESIGN_SCORE_THRESHOLDS.scalabilityGood
          ) {
            assert.ok(
              result.total < DESIGN_SCORE_THRESHOLDS.totalGood,
              'A yellow component must prevent a green total',
            );
          }
          if (result.total < DESIGN_SCORE_THRESHOLDS.totalGood) {
            const feedback = await analyzeDesignSupport(`${textTop}${textBottom}`, config, 'jp', {
              overallScore: result.total,
              contrastRatio: result.displayedContrastLc,
              scalability: result.scalabilityScore,
              designScore: result,
            });
            assert.doesNotMatch(feedback.tip, /赤く表示|総合点を下げている要因が分散/);
            assert.match(
              feedback.tip,
              /してください|すると|上げ|下げ|細く|太く|弱め|入力|調整|言い換え|分け|戻し|選び|離す|足す|使い/,
              'Feedback must include a concrete action',
            );
          }
        }
      }
    }
  }
}

console.table(cases);
console.log(`Scoring audit passed: ${matrixCount} matrix cases plus targeted edge cases.`);
