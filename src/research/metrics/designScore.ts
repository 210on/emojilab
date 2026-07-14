import { DesignScoreBreakdown, EmojiConfig, ScoreMetrics } from '../../../types';
import { getStrokeMetrics } from '../../../utils/kanjiStrokeCounts';
import { calculateAPCA } from './contrast';

export interface PreviewSurfaceSet {
  light: string;
  dark: string;
  customLight?: string;
  customDark?: string;
}

const DEFAULT_SURFACES: Required<PreviewSurfaceSet> = {
  light: '#FFFFFF',
  dark: '#1D1C1D',
  customLight: '#EEF3FA',
  customDark: '#2B2D31',
};

export const DESIGN_SCORE_THRESHOLDS = {
  contrastCritical: 45,
  contrastAcceptable: 60,
  contrastGood: 75,
  scalabilityCritical: 60,
  scalabilityAcceptable: 72,
  scalabilityGood: 82,
  totalAcceptable: 70,
  totalGood: 80,
} as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(clamp(value, 0, 100));
const segmenterConstructor = (
  Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity?: 'grapheme' | 'word' | 'sentence' },
    ) => {
      segment: (input: string) => Iterable<{ segment: string }>;
    };
  }
).Segmenter;

const getGraphemes = (text: string) => {
  if (!text) return [];
  if (!segmenterConstructor) return Array.from(text);
  const segmenter = new segmenterConstructor(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), (entry) => entry.segment);
};

const normalizeLc = (lc: number) => {
  if (lc >= DESIGN_SCORE_THRESHOLDS.contrastGood) {
    return 88 + Math.min(12, (lc - DESIGN_SCORE_THRESHOLDS.contrastGood) * 0.8);
  }
  if (lc >= DESIGN_SCORE_THRESHOLDS.contrastCritical) {
    return 55 + (lc - DESIGN_SCORE_THRESHOLDS.contrastCritical) * 1.1;
  }
  return Math.max(12, 20 + lc * 0.75);
};

const normalizeHex = (hex: string) => {
  const value = hex.trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : '#000000';
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
};

const srgbToLinear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const getOklch = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const red = srgbToLinear(r);
  const green = srgbToLinear(g);
  const blue = srgbToLinear(b);

  const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
  const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
  const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;

  const lPrime = Math.cbrt(l);
  const mPrime = Math.cbrt(m);
  const sPrime = Math.cbrt(s);

  const lightness = 0.2104542553 * lPrime + 0.7936177850 * mPrime - 0.0040720468 * sPrime;
  const a = 1.9779984951 * lPrime - 2.4285922050 * mPrime + 0.4505937099 * sPrime;
  const bAxis = 0.0259040371 * lPrime + 0.7827717662 * mPrime - 0.8086757660 * sPrime;
  const chroma = Math.sqrt(a * a + bAxis * bAxis);
  const rawHue = Math.atan2(bAxis, a) * (180 / Math.PI);
  const hue = rawHue < 0 ? rawHue + 360 : rawHue;

  return { lightness, chroma, hue };
};

const getColorFamily = (hex: string): DesignScoreBreakdown['color']['family'] => {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  if (lightness > 0.9 && saturation < 0.18) return 'white';
  if (lightness < 0.18 && saturation < 0.2) return 'black';
  if (saturation < 0.15) return 'gray';

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  if (hue < 20 || hue >= 345) return 'red';
  if (hue < 45) return 'orange';
  if (hue < 68) return 'yellow';
  if (hue < 150) return 'green';
  if (hue < 190) return 'cyan';
  if (hue < 255) return 'blue';
  if (hue < 320) return 'purple';
  return 'pink';
};

const getSurfaces = (surfaces?: Partial<PreviewSurfaceSet>) => ({
  light: normalizeHex(surfaces?.light ?? DEFAULT_SURFACES.light),
  dark: normalizeHex(surfaces?.dark ?? DEFAULT_SURFACES.dark),
  customLight: normalizeHex(surfaces?.customLight ?? DEFAULT_SURFACES.customLight),
  customDark: normalizeHex(surfaces?.customDark ?? DEFAULT_SURFACES.customDark),
});

const getSurfaceList = (surfaces?: Partial<PreviewSurfaceSet>) => {
  const normalized = getSurfaces(surfaces);
  return Array.from(new Set(Object.values(normalized)));
};

const getVisibleBoundaryLc = (
  config: EmojiConfig,
  surface: string,
  innerEffective: boolean,
  outerEffective: boolean,
  internalBoundaryLc: number,
) => {
  const outermostColor = outerEffective
    ? config.stroke2Color
    : innerEffective
      ? config.stroke1Color
      : config.mainColor;
  return Math.max(internalBoundaryLc, calculateAPCA(outermostColor, surface));
};

const getInternalBoundaryLc = (
  config: EmojiConfig,
  innerEffective: boolean,
  outerEffective: boolean,
) => {
  const boundaries: number[] = [];
  if (innerEffective) {
    boundaries.push(calculateAPCA(config.mainColor, config.stroke1Color));
  }
  if (outerEffective) {
    boundaries.push(calculateAPCA(
      innerEffective ? config.stroke1Color : config.mainColor,
      config.stroke2Color,
    ));
  }
  return boundaries.length > 0 ? Math.max(...boundaries) : 0;
};

const getCharacterCount = (text: string) =>
  getGraphemes(text).filter((grapheme) => grapheme.trim().length > 0).length;

const getApproxTextWidth = (text: string, letterSpacing = 0) => {
  const characters = getGraphemes(text);
  const naturalWidth = characters.reduce((total, char) => {
    if (/[\u3400-\u9fff\u3040-\u30ff]/u.test(char)) return total + 1;
    if (/[A-Z0-9]/.test(char)) return total + 0.72;
    if (/[a-z]/.test(char)) return total + 0.58;
    if (/[!！?？。、,.・ー〜~…\-]/.test(char)) return total + 0.42;
    return total + 0.65;
  }, 0);

  // Canvas rendering uses letter spacing in pixels at a 512px reference canvas.
  const spacingWidth = Math.max(characters.length - 1, 0) * (letterSpacing / (512 * 0.21));
  return Math.max(0, naturalWidth + spacingWidth);
};

const calculateContrastFit = (config: EmojiConfig, surfaces?: Partial<PreviewSurfaceSet>) => {
  const fillOnLightLc = calculateAPCA(config.mainColor, getSurfaces(surfaces).light);
  const fillOnDarkLc = calculateAPCA(config.mainColor, getSurfaces(surfaces).dark);
  const innerEffective = config.stroke1Enabled && config.stroke1Width >= 2;
  const outerEffective = config.stroke2Enabled && config.stroke2Width >= 4;
  const innerLc = innerEffective ? calculateAPCA(config.mainColor, config.stroke1Color) : 0;
  const internalBoundaryLc = getInternalBoundaryLc(config, innerEffective, outerEffective);
  const backgroundSeparationLc = Math.min(
    ...getSurfaceList(surfaces).map((surface) => getVisibleBoundaryLc(
      config,
      surface,
      innerEffective,
      outerEffective,
      internalBoundaryLc,
    )),
  );
  // A sub-critical internal boundary behaves as a merged color band; in that
  // case the next visible boundary defines the glyph silhouette.
  const localTextLc = internalBoundaryLc >= DESIGN_SCORE_THRESHOLDS.contrastCritical
    ? internalBoundaryLc
    : backgroundSeparationLc;
  const worstLc = Math.min(localTextLc, backgroundSeparationLc);
  const oklch = getOklch(config.mainColor);
  const highLightness = oklch.lightness >= 0.7;
  const highChroma = oklch.chroma >= 0.1;
  const currentInnerStrokeWorks = innerEffective && innerLc >= 45;
  const needsLocalContrastSupport =
    highLightness && highChroma && fillOnLightLc < DESIGN_SCORE_THRESHOLDS.contrastAcceptable;
  const recommendInnerStroke = needsLocalContrastSupport && !currentInnerStrokeWorks;
  const unnecessaryInnerStrokeRisk =
    currentInnerStrokeWorks &&
    config.stroke1Width >= 5 &&
    !needsLocalContrastSupport &&
    fillOnLightLc >= 60;

  let contrastFitScore = normalizeLc(localTextLc) * 0.55 + normalizeLc(backgroundSeparationLc) * 0.45;
  if (localTextLc < DESIGN_SCORE_THRESHOLDS.contrastCritical) {
    contrastFitScore = Math.min(contrastFitScore, 68);
  }
  if (backgroundSeparationLc < 35) contrastFitScore = Math.min(contrastFitScore, 72);

  return {
    contrastFitScore: round(contrastFitScore),
    displayedContrastLc: Math.round(worstLc),
    contrast: {
      localTextLc: Math.round(localTextLc),
      backgroundSeparationLc: Math.round(backgroundSeparationLc),
      worstLc: Math.round(worstLc),
      fillOnLightLc: Math.round(fillOnLightLc),
      fillOnDarkLc: Math.round(fillOnDarkLc),
      needsLocalContrastSupport,
      currentInnerStrokeWorks,
      recommendInnerStroke,
      unnecessaryInnerStrokeRisk,
    },
    strokeBase: {
      innerEffective,
      outerEffective,
    },
    color: {
      family: getColorFamily(config.mainColor),
      oklch: {
        lightness: Number(oklch.lightness.toFixed(3)),
        chroma: Number(oklch.chroma.toFixed(3)),
        hue: Math.round(oklch.hue),
      },
      highLightness,
      highChroma,
    },
  };
};

const getLineSizeMultiplier = (balance: number, line: 'top' | 'bottom') => {
  const normalized = clamp(Math.round(balance / 5) * 5, -50, 50);
  return clamp(line === 'top' ? 1 + normalized * 0.00857 : 1 - normalized * 0.00857, 0.56, 1.44);
};

const getApproxWidthFitScales = (
  config: EmojiConfig,
  widths: number[],
  targetWidth: number,
) => {
  if (!config.autoSquare) return widths.map(() => 1);

  const activeWidths = widths.filter((width) => width > 0);
  if (activeWidths.length === 0) return widths.map(() => 1);
  if (activeWidths.length === 1) {
    return widths.map((width) => width > 0 ? clamp(targetWidth / width, 0.62, 1.75) : 1);
  }

  const minWidth = Math.min(...activeWidths);
  const maxWidth = Math.max(...activeWidths);
  const geometricMean = Math.sqrt(activeWidths.reduce((product, width) => product * width, 1));
  const nudgedTarget = geometricMean * clamp(targetWidth / geometricMean, 0.92, 1.08);
  const sharedTarget = clamp(nudgedTarget, minWidth, maxWidth);
  return widths.map((width) => width > 0 ? clamp(sharedTarget / width, 0.62, 1.75) : 1);
};

const getWidthTransformPenalty = (deviationPercent: number) => {
  if (deviationPercent <= 10) return 0;
  if (deviationPercent <= 15) return ((deviationPercent - 10) / 5) * 3;
  if (deviationPercent <= 20) return 3 + ((deviationPercent - 15) / 5) * 4;
  return 7 + clamp((deviationPercent - 20) / 25, 0, 1) * 5;
};

const calculateGeometry = (config: EmojiConfig) => {
  const topActive = config.textTop.trim().length > 0;
  const bottomActive = config.textBottom.trim().length > 0;
  const topScale = getLineSizeMultiplier(config.lineSizeBalance, 'top');
  const bottomScale = getLineSizeMultiplier(config.lineSizeBalance, 'bottom');
  const topWidth = topActive ? getApproxTextWidth(config.textTop, config.letterSpacing) * topScale : 0;
  const bottomWidth = bottomActive ? getApproxTextWidth(config.textBottom, config.letterSpacing) * bottomScale : 0;
  const effectiveStrokeWidth =
    (config.stroke1Enabled ? clamp(config.stroke1Width, 0, 30) : 0) +
    (config.stroke2Enabled ? clamp(config.stroke2Width, 0, 30) : 0);
  const targetWidth = Math.max(
    1.34,
    (1 - 2 * (0.12 + effectiveStrokeWidth / 332 + 4 / 512)) / 0.21,
  );
  const fitScales = getApproxWidthFitScales(config, [topWidth, bottomWidth], targetWidth);
  const condenseScale = clamp(config.condense, 60, 140) / 100;
  const topFinal = topWidth * fitScales[0] * condenseScale;
  const bottomFinal = bottomWidth * fitScales[1] * condenseScale;
  const activeFinalWidths = [topFinal, bottomFinal].filter((width) => width > 0);
  const effectiveWidthScales = [
    ...(topActive ? [fitScales[0] * condenseScale] : []),
    ...(bottomActive ? [fitScales[1] * condenseScale] : []),
  ];
  const maxWidthDeviation = effectiveWidthScales.length > 0
    ? Math.max(...effectiveWidthScales.map((scale) => Math.abs(scale - 1) * 100))
    : 0;
  const widthTransformRisk = clamp(maxWidthDeviation / 45, 0, 1);
  const letterSpacingValue = clamp(config.letterSpacing, -20, 48);
  const letterSpacingExcess = Math.max(0, -6 - letterSpacingValue, letterSpacingValue - 16);
  const letterSpacingRisk = clamp(letterSpacingExcess / 32, 0, 1);
  const lineGapRatio = clamp(0.082 + clamp(config.spacing, -130, 30) / 700, 0, 0.22);
  const lineCount = Number(topActive) + Number(bottomActive);
  const lineSpacingRisk = lineCount < 2
    ? 0
    : lineGapRatio < 0.008
      ? clamp((0.008 - lineGapRatio) / 0.008, 0, 1)
      : clamp((lineGapRatio - 0.12) / 0.1, 0, 1);
  const lineBalanceRatio = activeFinalWidths.length < 2
    ? 1
    : Math.max(...activeFinalWidths) / Math.max(0.2, Math.min(...activeFinalWidths));
  const lineBalanceRisk = clamp((lineBalanceRatio - 1.55) / 1.45, 0, 1);
  const blockWidth = activeFinalWidths.length > 0 ? Math.max(...activeFinalWidths) : 0;
  const lineHeight =
    (topActive ? topScale : 0) +
    (bottomActive ? bottomScale : 0) +
    Math.max(0, lineCount - 1) * (lineGapRatio / 0.21);
  const coreAspectRatio = blockWidth > 0 ? clamp(blockWidth / Math.max(0.2, lineHeight), 0.2, 4) : 0;
  const strokeExtent = effectiveStrokeWidth * 2 / (512 * 0.21);
  const fullAspectRatio = blockWidth > 0
    ? clamp((blockWidth + strokeExtent) / Math.max(0.2, lineHeight + strokeExtent), 0.2, 4)
    : 0;
  const aspectRatioRisk = fullAspectRatio === 0
    ? 0
    : fullAspectRatio < 0.8
      ? clamp((0.8 - fullAspectRatio) / 0.5, 0, 1)
      : clamp((fullAspectRatio - 1.25) / 1.75, 0, 1);

  return {
    maxWidthDeviation,
    minimumWidthScale: effectiveWidthScales.length > 0 ? Math.min(...effectiveWidthScales) : 1,
    geometry: {
      coreAspectRatio: Number(coreAspectRatio.toFixed(2)),
      fullAspectRatio: Number(fullAspectRatio.toFixed(2)),
      effectiveTopWidthScale: Number((topActive ? fitScales[0] * condenseScale : 0).toFixed(2)),
      effectiveBottomWidthScale: Number((bottomActive ? fitScales[1] * condenseScale : 0).toFixed(2)),
      widthTransformRisk: Number(widthTransformRisk.toFixed(2)),
      letterSpacingRisk: Number(letterSpacingRisk.toFixed(2)),
      lineSpacingRisk: Number(lineSpacingRisk.toFixed(2)),
      lineBalanceRisk: Number(lineBalanceRisk.toFixed(2)),
      aspectRatioRisk: Number(aspectRatioRisk.toFixed(2)),
    },
  };
};

const calculateScalabilityScore = (
  config: EmojiConfig,
  contrast: ReturnType<typeof calculateContrastFit>,
) => {
  const text = `${config.textTop}${config.textBottom}`;
  const characterCount = getCharacterCount(text);
  const strokeMetrics = getStrokeMetrics(text);
  const geometry = calculateGeometry(config);
  const penalties = {
    emptyText: characterCount === 0 ? 100 : 0,
    characterCount: characterCount > 2 ? Math.min(32, (characterCount - 2) * 8) : 0,
    fontWeight: config.fontWeight < 400
      ? 14
      : config.fontWeight < 600
        ? 6
        : config.fontWeight >= 900 && strokeMetrics.denseKanjiCount > 0
          ? 8
          : 0,
    kanjiComplexity: strokeMetrics.knownKanjiCount === 0
      ? 0
      : (strokeMetrics.maxStrokeCount >= 20 ? 16 : strokeMetrics.maxStrokeCount >= 16 ? 10 : strokeMetrics.maxStrokeCount >= 14 ? 6 : 0) +
        (strokeMetrics.denseKanjiCount >= 2 ? 10 : strokeMetrics.denseKanjiCount === 1 ? 5 : 0),
    unknownKanji: strokeMetrics.unknownKanjiCount >= 2 ? 7 : strokeMetrics.unknownKanjiCount === 1 ? 4 : 0,
    innerStroke: config.stroke1Enabled
      ? config.stroke1Width >= 10
        ? 14
        : config.stroke1Width >= 8 && strokeMetrics.denseKanjiCount > 0
          ? 10
          : config.stroke1Width >= 6 && strokeMetrics.denseKanjiCount === 0
            ? 3
            : 0
      : 0,
    outerStroke: !config.stroke2Enabled
      ? 0
      : config.stroke2Width < 8
        ? 4
        : config.stroke2Width <= 14
          ? 0
          : config.stroke2Width > 20
            ? 7
            : 2,
    unnecessaryInnerStroke: contrast.contrast.unnecessaryInnerStrokeRisk ? 6 : 0,
    widthTransform: getWidthTransformPenalty(geometry.maxWidthDeviation),
    denseWidthInteraction: strokeMetrics.denseKanjiCount > 0 && geometry.minimumWidthScale < 0.9 ? 7 : 0,
    letterSpacing: geometry.geometry.letterSpacingRisk * 6,
    lineSpacing: geometry.geometry.lineSpacingRisk * 5,
    lineBalance: geometry.geometry.lineBalanceRisk * 8,
    aspectRatio: geometry.geometry.aspectRatioRisk * 6,
  };
  const penaltyTotal = Object.values(penalties).reduce((sum, penalty) => sum + penalty, 0);

  return {
    scalabilityScore: round(100 - penaltyTotal),
    scalabilityPenalties: {
      emptyText: penalties.emptyText,
      characterCount: Number(penalties.characterCount.toFixed(1)),
      fontWeight: Number(penalties.fontWeight.toFixed(1)),
      kanjiComplexity: Number(penalties.kanjiComplexity.toFixed(1)),
      unknownKanji: Number(penalties.unknownKanji.toFixed(1)),
      innerStroke: Number(penalties.innerStroke.toFixed(1)),
      outerStroke: Number(penalties.outerStroke.toFixed(1)),
      unnecessaryInnerStroke: Number(penalties.unnecessaryInnerStroke.toFixed(1)),
      widthTransform: Number(penalties.widthTransform.toFixed(1)),
      denseWidthInteraction: Number(penalties.denseWidthInteraction.toFixed(1)),
      letterSpacing: Number(penalties.letterSpacing.toFixed(1)),
      lineSpacing: Number(penalties.lineSpacing.toFixed(1)),
      lineBalance: Number(penalties.lineBalance.toFixed(1)),
      aspectRatio: Number(penalties.aspectRatio.toFixed(1)),
      total: Number(penaltyTotal.toFixed(1)),
    },
    characterComplexity: {
      characterCount,
      maxStrokeCount: strokeMetrics.maxStrokeCount,
      denseKanjiCount: strokeMetrics.denseKanjiCount,
      unknownKanjiCount: strokeMetrics.unknownKanjiCount,
    },
    geometry: geometry.geometry,
  };
};

const calculateCriticalRisk = (
  displayedContrastLc: number,
  scalabilityScore: number,
) => {
  let criticalRisk = 0;

  if (displayedContrastLc < DESIGN_SCORE_THRESHOLDS.contrastCritical) criticalRisk += 10;
  if (scalabilityScore < DESIGN_SCORE_THRESHOLDS.scalabilityCritical) criticalRisk += 10;

  return criticalRisk;
};

const calculateConditionCap = (
  displayedContrastLc: number,
  scalabilityScore: number,
) => {
  if (
    displayedContrastLc < DESIGN_SCORE_THRESHOLDS.contrastAcceptable ||
    scalabilityScore < DESIGN_SCORE_THRESHOLDS.scalabilityAcceptable
  ) return DESIGN_SCORE_THRESHOLDS.totalAcceptable - 1;
  if (
    displayedContrastLc < DESIGN_SCORE_THRESHOLDS.contrastGood ||
    scalabilityScore < DESIGN_SCORE_THRESHOLDS.scalabilityGood
  ) return DESIGN_SCORE_THRESHOLDS.totalGood - 1;
  return 100;
};

const calculateRiskDeductionTotal = (
  contrastFitScore: number,
  displayedContrastLc: number,
  scalabilityScore: number,
) => {
  const contrastRisk = (100 - contrastFitScore) * 0.5;
  const scalabilityRisk = (100 - scalabilityScore) * 0.5;
  const criticalRisk = calculateCriticalRisk(displayedContrastLc, scalabilityScore);
  const conditionCap = calculateConditionCap(displayedContrastLc, scalabilityScore);
  const rawScore = 100 - contrastRisk - scalabilityRisk - criticalRisk;

  return round(Math.min(rawScore, conditionCap));
};

export const calculateDesignScore = (
  config: EmojiConfig,
  surfaces?: Partial<PreviewSurfaceSet>,
): DesignScoreBreakdown => {
  const contrast = calculateContrastFit(config, surfaces);
  if (getCharacterCount(`${config.textTop}${config.textBottom}`) === 0) {
    contrast.contrastFitScore = 0;
    contrast.displayedContrastLc = 0;
    contrast.contrast.localTextLc = 0;
    contrast.contrast.backgroundSeparationLc = 0;
    contrast.contrast.worstLc = 0;
    contrast.contrast.recommendInnerStroke = false;
  }
  const scalability = calculateScalabilityScore(config, contrast);
  const total = calculateRiskDeductionTotal(
    contrast.contrastFitScore,
    contrast.displayedContrastLc,
    scalability.scalabilityScore,
  );

  return {
    total,
    contrastFitScore: contrast.contrastFitScore,
    scalabilityScore: scalability.scalabilityScore,
    displayedContrastLc: contrast.displayedContrastLc,
    contrast: contrast.contrast,
    stroke: {
      innerEffective: contrast.strokeBase.innerEffective,
      outerEffective: contrast.strokeBase.outerEffective,
      innerTooHeavy: config.stroke1Enabled && config.stroke1Width >= 10,
      outerTooThin: config.stroke2Enabled && config.stroke2Width > 1 && config.stroke2Width < 8,
      outerStable: config.stroke2Enabled && config.stroke2Width >= 8 && config.stroke2Width <= 14,
      outerTooHeavy: config.stroke2Enabled && config.stroke2Width > 20,
    },
    characterComplexity: scalability.characterComplexity,
    scalabilityPenalties: scalability.scalabilityPenalties,
    geometry: scalability.geometry,
    color: contrast.color,
  };
};

export const calculateScoreMetrics = (
  config: EmojiConfig,
  surfaces?: Partial<PreviewSurfaceSet>,
): ScoreMetrics => {
  const designScore = calculateDesignScore(config, surfaces);

  return {
    overallScore: designScore.total,
    contrastRatio: designScore.displayedContrastLc,
    scalability: designScore.scalabilityScore,
    designScore,
  };
};
