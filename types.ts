
export type Language = 'en' | 'jp';
export type TextAlign = 'left' | 'center' | 'right';

export interface EmojiConfig {
  textTop: string;
  textBottom: string;
  lineSizeBalance: number;
  fontFamily: string;
  fontWeight: number;
  condense: number;
  letterSpacing: number;
  mainColor: string;
  textAlign: TextAlign;
  // Stroke 1 (Inner)
  stroke1Enabled: boolean;
  stroke1Color: string;
  stroke1Width: number;
  // Stroke 2 (Outer)
  stroke2Enabled: boolean;
  stroke2Color: string;
  stroke2Width: number;
  // Layout
  autoSquare: boolean;
  spacing: number;
}

export interface ScoreMetrics {
  overallScore: number;
  contrastRatio: number;
  scalability: number;
  designScore?: DesignScoreBreakdown;
}

export interface ScalabilityPenaltyBreakdown {
  emptyText: number;
  characterCount: number;
  fontWeight: number;
  kanjiComplexity: number;
  unknownKanji: number;
  innerStroke: number;
  outerStroke: number;
  unnecessaryInnerStroke: number;
  widthTransform: number;
  denseWidthInteraction: number;
  letterSpacing: number;
  lineSpacing: number;
  lineBalance: number;
  aspectRatio: number;
  total: number;
}

export interface DesignScoreBreakdown {
  total: number;
  contrastFitScore: number;
  scalabilityScore: number;
  displayedContrastLc: number;
  contrast: {
    localTextLc: number;
    backgroundSeparationLc: number;
    worstLc: number;
    fillOnLightLc: number;
    fillOnDarkLc: number;
    needsLocalContrastSupport: boolean;
    currentInnerStrokeWorks: boolean;
    recommendInnerStroke: boolean;
    unnecessaryInnerStrokeRisk: boolean;
  };
  stroke: {
    innerEffective: boolean;
    outerEffective: boolean;
    innerTooHeavy: boolean;
    outerTooThin: boolean;
    outerStable: boolean;
    outerTooHeavy: boolean;
  };
  characterComplexity: {
    characterCount: number;
    topCharacterCount: number;
    bottomCharacterCount: number;
    maxCharactersPerLine: number;
    kanaThreeCharacterLineCount: number;
    maxStrokeCount: number;
    denseKanjiCount: number;
    unknownKanjiCount: number;
  };
  scalabilityPenalties: ScalabilityPenaltyBreakdown;
  geometry: {
    coreAspectRatio: number;
    fullAspectRatio: number;
    effectiveTopWidthScale: number;
    effectiveBottomWidthScale: number;
    widthTransformRisk: number;
    letterSpacingRisk: number;
    lineSpacingRisk: number;
    lineBalanceRisk: number;
    aspectRatioRisk: number;
  };
  color: {
    family: 'yellow' | 'orange' | 'red' | 'pink' | 'purple' | 'blue' | 'cyan' | 'green' | 'white' | 'black' | 'gray';
    oklch: {
      lightness: number;
      chroma: number;
      hue: number;
    };
    highLightness: boolean;
    highChroma: boolean;
  };
}

export interface SavedEmoji extends EmojiConfig {
  id: string;
  name: string;
  createdAt: string;
}
