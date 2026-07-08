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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(clamp(value, 0, 100));

const normalizeLc = (lc: number) => {
  if (lc >= 75) return 88 + Math.min(12, (lc - 75) * 0.8);
  if (lc >= 45) return 55 + (lc - 45) * 1.1;
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
) => {
  const candidates = [calculateAPCA(config.mainColor, surface)];
  if (innerEffective) candidates.push(calculateAPCA(config.stroke1Color, surface));
  if (outerEffective) candidates.push(calculateAPCA(config.stroke2Color, surface));
  return Math.max(...candidates);
};

const getCharacterCount = (text: string) => [...text].filter((char) => char.trim().length > 0).length;

const getApproxTextWidth = (text: string) => {
  return [...text].reduce((total, char) => {
    if (/[\u3400-\u9fff\u3040-\u30ff]/u.test(char)) return total + 1;
    if (/[A-Z0-9]/.test(char)) return total + 0.72;
    if (/[a-z]/.test(char)) return total + 0.58;
    if (/[!！?？。、,.・ー〜~…\-]/.test(char)) return total + 0.42;
    return total + 0.65;
  }, 0);
};

const calculateContrastFit = (config: EmojiConfig, surfaces?: Partial<PreviewSurfaceSet>) => {
  const fillOnLightLc = calculateAPCA(config.mainColor, getSurfaces(surfaces).light);
  const fillOnDarkLc = calculateAPCA(config.mainColor, getSurfaces(surfaces).dark);
  const innerEffective = config.stroke1Enabled && config.stroke1Width >= 2;
  const outerEffective = config.stroke2Enabled && config.stroke2Width >= 4;
  const innerLc = innerEffective ? calculateAPCA(config.mainColor, config.stroke1Color) : 0;
  const outerLc = outerEffective ? calculateAPCA(config.mainColor, config.stroke2Color) : 0;
  const localTextLc = Math.max(
    innerLc,
    outerLc,
    !innerEffective && !outerEffective ? Math.min(fillOnLightLc, fillOnDarkLc) : 0,
  );
  const backgroundSeparationLc = Math.min(
    ...getSurfaceList(surfaces).map((surface) => getVisibleBoundaryLc(
      config,
      surface,
      innerEffective,
      outerEffective,
    )),
  );
  const worstLc = Math.min(localTextLc, backgroundSeparationLc);
  const oklch = getOklch(config.mainColor);
  const highLightness = oklch.lightness >= 0.7;
  const highChroma = oklch.chroma >= 0.1;
  const currentInnerStrokeWorks = innerEffective && innerLc >= 45;
  const needsLocalContrastSupport = highLightness && highChroma && fillOnLightLc < 60;
  const recommendInnerStroke = needsLocalContrastSupport && !currentInnerStrokeWorks;
  const unnecessaryInnerStrokeRisk =
    currentInnerStrokeWorks &&
    config.stroke1Width >= 5 &&
    !needsLocalContrastSupport &&
    fillOnLightLc >= 60;

  let contrastFitScore = normalizeLc(localTextLc) * 0.55 + normalizeLc(backgroundSeparationLc) * 0.45;
  if (localTextLc < 45) contrastFitScore = Math.min(contrastFitScore, 68);
  if (backgroundSeparationLc < 35) contrastFitScore = Math.min(contrastFitScore, 72);
  if (recommendInnerStroke) contrastFitScore -= 8;
  if (unnecessaryInnerStrokeRisk) contrastFitScore -= 4;
  if (config.stroke1Enabled && config.stroke1Width > 10) contrastFitScore -= 4;

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

const calculateScalabilityScore = (
  config: EmojiConfig,
  contrast: ReturnType<typeof calculateContrastFit>,
) => {
  const text = `${config.textTop}${config.textBottom}`;
  const characterCount = getCharacterCount(text);
  const strokeMetrics = getStrokeMetrics(text);
  let score = 100;

  if (characterCount > 2) score -= Math.min(32, (characterCount - 2) * 8);
  if (config.fontWeight < 400) score -= 14;
  else if (config.fontWeight < 600) score -= 6;
  else if (config.fontWeight >= 900 && strokeMetrics.denseKanjiCount > 0) score -= 8;
  else if (config.fontWeight >= 700 && strokeMetrics.denseKanjiCount === 0) score += 4;

  if (strokeMetrics.knownKanjiCount > 0) {
    if (strokeMetrics.maxStrokeCount >= 20) score -= 16;
    else if (strokeMetrics.maxStrokeCount >= 16) score -= 10;
    else if (strokeMetrics.maxStrokeCount >= 14) score -= 6;

    if (strokeMetrics.denseKanjiCount >= 2) score -= 10;
    else if (strokeMetrics.denseKanjiCount === 1) score -= 5;
  }

  if (strokeMetrics.unknownKanjiCount >= 2) score -= 7;
  else if (strokeMetrics.unknownKanjiCount === 1) score -= 4;

  if (config.stroke1Enabled && config.stroke1Width >= 10) score -= 14;
  else if (config.stroke1Enabled && config.stroke1Width >= 8 && strokeMetrics.denseKanjiCount > 0) score -= 10;
  else if (config.stroke1Enabled && config.stroke1Width >= 6 && strokeMetrics.denseKanjiCount === 0) score -= 3;

  if (!config.stroke2Enabled || config.stroke2Width <= 1) score -= 8;
  else if (config.stroke2Width < 8) score -= 4;
  else if (config.stroke2Width <= 14) score += 6;
  else if (config.stroke2Width > 20) score -= 7;
  else score -= 2;

  if (contrast.contrast.recommendInnerStroke) score -= 3;
  if (contrast.contrast.unnecessaryInnerStrokeRisk) score -= 6;
  if (strokeMetrics.denseKanjiCount > 0 && config.condense < 90) score -= 7;

  return {
    scalabilityScore: round(score),
    characterComplexity: {
      characterCount,
      maxStrokeCount: strokeMetrics.maxStrokeCount,
      denseKanjiCount: strokeMetrics.denseKanjiCount,
      unknownKanjiCount: strokeMetrics.unknownKanjiCount,
    },
  };
};

const calculateCompositionScore = (config: EmojiConfig) => {
  const topWidth = Math.max(0.2, getApproxTextWidth(config.textTop));
  const bottomWidth = Math.max(0.2, getApproxTextWidth(config.textBottom));
  const topScale = clamp(1 + config.lineSizeBalance / 125, 0.55, 1.45);
  const bottomScale = clamp(1 - config.lineSizeBalance / 125, 0.55, 1.45);
  const widthScale = config.condense / 100;
  const topFinal = topWidth * topScale * widthScale;
  const bottomFinal = bottomWidth * bottomScale * widthScale;
  const blockWidth = Math.max(topFinal, bottomFinal);
  const lineCount = config.textBottom.trim() ? 2 : 1;
  const lineHeight = lineCount === 1 ? 1.05 : 1.95 + config.spacing / 160;
  const coreAspectRatio = clamp(blockWidth / Math.max(0.8, lineHeight), 0.2, 4);
  const strokeInset = (config.stroke1Enabled ? config.stroke1Width : 0) + (config.stroke2Enabled ? config.stroke2Width : 0);
  const strokeAspectCorrection = 1 + clamp(strokeInset / 110, 0, 0.32);
  const fullAspectRatio = clamp(coreAspectRatio / strokeAspectCorrection, 0.2, 4);
  const widthTransformRisk = Math.min(1, Math.abs(config.condense - 100) / 45);
  const spacingRisk = Math.min(1, Math.abs(config.spacing + 50) / 95);
  const lineBalanceRatio = Math.max(topFinal, bottomFinal) / Math.max(0.2, Math.min(topFinal, bottomFinal));
  const lineBalanceRisk = Math.min(1, Math.max(0, lineBalanceRatio - 1.55) / 1.45);
  const aspectRisk = Math.min(1, Math.abs(Math.log(fullAspectRatio)) / Math.log(2.6));

  let score = 94;
  score -= widthTransformRisk * 12;
  score -= spacingRisk * 8;
  score -= lineBalanceRisk * 10;
  score -= aspectRisk * 8;
  if (config.autoSquare && lineBalanceRisk > 0.35) score += 4;

  return {
    compositionScore: round(score),
    composition: {
      coreAspectRatio: Number(coreAspectRatio.toFixed(2)),
      fullAspectRatio: Number(fullAspectRatio.toFixed(2)),
      widthTransformRisk: Number(widthTransformRisk.toFixed(2)),
      spacingRisk: Number(spacingRisk.toFixed(2)),
      lineBalanceRisk: Number(lineBalanceRisk.toFixed(2)),
    },
  };
};

export const calculateDesignScore = (
  config: EmojiConfig,
  surfaces?: Partial<PreviewSurfaceSet>,
): DesignScoreBreakdown => {
  const contrast = calculateContrastFit(config, surfaces);
  const scalability = calculateScalabilityScore(config, contrast);
  const composition = calculateCompositionScore(config);
  const total = round(
    contrast.contrastFitScore * 0.45 +
    scalability.scalabilityScore * 0.35 +
    composition.compositionScore * 0.2,
  );

  return {
    total,
    contrastFitScore: contrast.contrastFitScore,
    scalabilityScore: scalability.scalabilityScore,
    compositionScore: composition.compositionScore,
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
    composition: composition.composition,
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
    compositionStability: designScore.compositionScore,
    designScore,
  };
};
