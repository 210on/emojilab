
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
}

export interface SavedEmoji extends EmojiConfig {
  id: string;
  name: string;
  createdAt: string;
}
