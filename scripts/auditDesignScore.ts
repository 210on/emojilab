import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PCCS_BRIGHT_TONE_PALETTE } from '../constants/colorPalettes';
import { analyzeDesignSupport } from '../services/designFeedbackService';
import { calculateAPCA } from '../src/research/metrics/contrast';
import {
  calculateDesignScore,
  calculateScoreMetrics,
  DESIGN_SCORE_THRESHOLDS,
} from '../src/research/metrics/designScore';
import { METRIC_VERSION } from '../src/research/metrics/metricVersion';
import { calculateWcagContrastRatio } from '../src/research/metrics/wcagContrast';
import { EmojiConfig } from '../types';

const exportArgument = process.argv.find((argument) => argument.startsWith('--export='));
const exportPath = exportArgument?.slice('--export='.length);

const escapeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  return [
    columns.map(escapeCsvValue).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(',')),
  ].join('\n');
};

const getTotalBand = (value: number) => value >= 80 ? 'good' : value >= 70 ? 'adjust' : 'improve';
const getContrastBand = (value: number) => value >= 75 ? 'good' : value >= 60 ? 'acceptable' : 'critical';
const getScalabilityBand = (value: number) => value >= 82 ? 'good' : value >= 72 ? 'acceptable' : 'critical';

const getDominantPenaltyNames = (result: ReturnType<typeof calculateDesignScore>) =>
  Object.entries(result.scalabilityPenalties)
    .filter(([key, value]) => key !== 'total' && value > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([key]) => key);

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

const twoLineFourCharacterConfig = {
  ...baseConfig,
  textTop: 'AB',
  textBottom: 'CD',
  condense: 80,
};
const twoLineFourCharacterFeedback = await analyzeDesignSupport(
  'ABCD',
  twoLineFourCharacterConfig,
  'jp',
  calculateScoreMetrics(twoLineFourCharacterConfig),
);
assert.match(twoLineFourCharacterFeedback.tip, /文字量/);
assert.doesNotMatch(
  twoLineFourCharacterFeedback.tip,
  /上下2段へ分け|上下2段に分け|上段・下段に分け/,
  'An already two-line input must not be told to split into two lines',
);

const singleLineFourCharacterConfig = {
  ...twoLineFourCharacterConfig,
  textTop: 'ABCD',
  textBottom: '',
};
const singleLineFourCharacterFeedback = await analyzeDesignSupport(
  'ABCD',
  singleLineFourCharacterConfig,
  'jp',
  calculateScoreMetrics(singleLineFourCharacterConfig),
);
assert.match(
  singleLineFourCharacterFeedback.tip,
  /上下2段へ分け|上下2段に分け/,
  'A crowded single-line input may be offered a two-line split',
);

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
  { id: 'none', config: { stroke1Enabled: false, stroke2Enabled: false } },
  { id: 'inner-4', config: { stroke1Enabled: true, stroke1Width: 4, stroke2Enabled: false } },
  { id: 'outer-10', config: { stroke1Enabled: false, stroke2Enabled: true, stroke2Width: 10 } },
  { id: 'inner-4-outer-10', config: { stroke1Enabled: true, stroke1Width: 4, stroke2Enabled: true, stroke2Width: 10 } },
  { id: 'inner-12-outer-25', config: { stroke1Enabled: true, stroke1Width: 12, stroke2Enabled: true, stroke2Width: 25 } },
];

let matrixCount = 0;
const auditRows: Array<Record<string, unknown>> = [];
for (const mainColor of colors) {
  for (const [textTop, textBottom] of texts) {
    for (const fontWeight of weights) {
      for (const condense of condenses) {
        for (const strokeMode of strokeModes) {
          const config = { ...baseConfig, mainColor, textTop, textBottom, fontWeight, condense, ...strokeMode.config };
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
          const feedback = await analyzeDesignSupport(`${textTop}${textBottom}`, config, 'jp', {
            overallScore: result.total,
            contrastRatio: result.displayedContrastLc,
            scalability: result.scalabilityScore,
            designScore: result,
          });
          if (result.total < DESIGN_SCORE_THRESHOLDS.totalGood) {
            assert.doesNotMatch(feedback.tip, /赤く表示|総合点を下げている要因が分散/);
            assert.match(
              feedback.tip,
              /してください|すると|上げ|下げ|細く|太く|弱め|入力|調整|言い換え|分け|戻し|選び|離す|足す|使い/,
              'Feedback must include a concrete action',
            );
          }
          const penalties = result.scalabilityPenalties;
          auditRows.push({
            case_id: `case-${String(matrixCount).padStart(4, '0')}`,
            metric_version: METRIC_VERSION,
            text_top: textTop,
            text_bottom: textBottom,
            character_count: result.characterComplexity.characterCount,
            max_kanji_stroke_count: result.characterComplexity.maxStrokeCount,
            dense_kanji_count: result.characterComplexity.denseKanjiCount,
            unknown_kanji_count: result.characterComplexity.unknownKanjiCount,
            main_color: mainColor,
            font_family: config.fontFamily,
            font_weight: fontWeight,
            width_percent: condense,
            letter_spacing: config.letterSpacing,
            line_spacing: config.spacing,
            line_size_balance: config.lineSizeBalance,
            width_fit_enabled: config.autoSquare,
            stroke_mode: strokeMode.id,
            inner_enabled: config.stroke1Enabled,
            inner_color: config.stroke1Color,
            inner_width: config.stroke1Width,
            outer_enabled: config.stroke2Enabled,
            outer_color: config.stroke2Color,
            outer_width: config.stroke2Width,
            total_score: result.total,
            total_band: getTotalBand(result.total),
            displayed_apca_lc: result.displayedContrastLc,
            contrast_band: getContrastBand(result.displayedContrastLc),
            contrast_fit_score: result.contrastFitScore,
            scalability_score: result.scalabilityScore,
            scalability_band: getScalabilityBand(result.scalabilityScore),
            local_text_lc: result.contrast.localTextLc,
            background_separation_lc: result.contrast.backgroundSeparationLc,
            fill_on_light_lc: result.contrast.fillOnLightLc,
            fill_on_dark_lc: result.contrast.fillOnDarkLc,
            needs_local_contrast_support: result.contrast.needsLocalContrastSupport,
            current_inner_stroke_works: result.contrast.currentInnerStrokeWorks,
            recommend_inner_stroke: result.contrast.recommendInnerStroke,
            unnecessary_inner_stroke_risk: result.contrast.unnecessaryInnerStrokeRisk,
            inner_effective: result.stroke.innerEffective,
            outer_effective: result.stroke.outerEffective,
            color_family: result.color.family,
            oklch_lightness: result.color.oklch.lightness,
            oklch_chroma: result.color.oklch.chroma,
            oklch_hue: result.color.oklch.hue,
            penalty_empty_text: penalties.emptyText,
            penalty_character_count: penalties.characterCount,
            penalty_font_weight: penalties.fontWeight,
            penalty_kanji_complexity: penalties.kanjiComplexity,
            penalty_unknown_kanji: penalties.unknownKanji,
            penalty_inner_stroke: penalties.innerStroke,
            penalty_outer_stroke: penalties.outerStroke,
            penalty_unnecessary_inner_stroke: penalties.unnecessaryInnerStroke,
            penalty_width_transform: penalties.widthTransform,
            penalty_dense_width_interaction: penalties.denseWidthInteraction,
            penalty_letter_spacing: penalties.letterSpacing,
            penalty_line_spacing: penalties.lineSpacing,
            penalty_line_balance: penalties.lineBalance,
            penalty_aspect_ratio: penalties.aspectRatio,
            penalty_total: penalties.total,
            dominant_penalties: getDominantPenaltyNames(result),
            core_aspect_ratio: result.geometry.coreAspectRatio,
            full_aspect_ratio: result.geometry.fullAspectRatio,
            effective_top_width_scale: result.geometry.effectiveTopWidthScale,
            effective_bottom_width_scale: result.geometry.effectiveBottomWidthScale,
            width_transform_risk: result.geometry.widthTransformRisk,
            letter_spacing_risk: result.geometry.letterSpacingRisk,
            line_spacing_risk: result.geometry.lineSpacingRisk,
            line_balance_risk: result.geometry.lineBalanceRisk,
            aspect_ratio_risk: result.geometry.aspectRatioRisk,
            feedback_tip_ja: feedback.tip,
          });
        }
      }
    }
  }
}

if (exportPath) {
  const resolvedExportPath = resolve(process.cwd(), exportPath);
  const paletteExportPath = resolve(dirname(resolvedExportPath), 'default-palette-analysis.csv');
  await mkdir(dirname(resolvedExportPath), { recursive: true });
  await writeFile(resolvedExportPath, `${toCsv(auditRows)}\n`, 'utf8');

  const paletteRows = PCCS_BRIGHT_TONE_PALETTE.map((color, index) => {
    const result = score({
      textTop: '色',
      textBottom: '',
      mainColor: color.hex,
      stroke1Enabled: false,
      stroke2Enabled: false,
    });
    const whiteLc = Math.round(calculateAPCA(color.hex, '#FFFFFF'));
    const blackLc = Math.round(calculateAPCA(color.hex, '#000000'));
    return {
      order: index + 1,
      tone: color.tone,
      pccs_symbol: color.pccsSymbol,
      name_ja: color.nameJa,
      hex: color.hex,
      apca_lc_on_white: whiteLc,
      apca_lc_on_black: blackLc,
      wcag_ratio_on_white: Number(calculateWcagContrastRatio(color.hex, '#FFFFFF').toFixed(2)),
      wcag_ratio_on_black: Number(calculateWcagContrastRatio(color.hex, '#000000').toFixed(2)),
      oklch_lightness: result.color.oklch.lightness,
      oklch_chroma: result.color.oklch.chroma,
      oklch_hue: result.color.oklch.hue,
      white_contrast_band: getContrastBand(whiteLc),
      black_contrast_band: getContrastBand(blackLc),
      ui_recommends_black_inner: result.contrast.recommendInnerStroke,
    };
  });
  await writeFile(paletteExportPath, `${toCsv(paletteRows)}\n`, 'utf8');
  console.log(`Exported ${auditRows.length} audit rows to ${resolvedExportPath}`);
  console.log(`Exported ${paletteRows.length} palette rows to ${paletteExportPath}`);
}

console.table(cases);
console.log(`Scoring audit passed: ${matrixCount} matrix cases plus targeted edge cases.`);
