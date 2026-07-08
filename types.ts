
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
  compositionStability?: number;
  designScore?: DesignScoreBreakdown;
}

export interface DesignScoreBreakdown {
  total: number;
  contrastFitScore: number;
  scalabilityScore: number;
  compositionScore: number;
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
    maxStrokeCount: number;
    denseKanjiCount: number;
    unknownKanjiCount: number;
  };
  composition: {
    coreAspectRatio: number;
    fullAspectRatio: number;
    widthTransformRisk: number;
    spacingRisk: number;
    lineBalanceRisk: number;
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
