import { EmojiConfig } from '../../../types';
import { getStrokeMetrics } from '../../../utils/kanjiStrokeCounts';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const calculateComposition = (config: EmojiConfig): number => {
  const text = `${config.textTop}${config.textBottom}`;
  const chars = [...text].filter((char) => char.trim().length > 0);
  const charCount = chars.length;
  const symbolCount = chars.filter((char) => /[!！?？。、,.・ー〜~…\-]/.test(char)).length;
  const strokeMetrics = getStrokeMetrics(text);
  let score = 92;

  if (charCount >= 6) score -= 30;
  else if (charCount === 5) score -= 22;
  else if (charCount === 4) score -= 14;
  else if (charCount === 3) score -= 7;

  if (symbolCount >= 2) score -= 8;
  else if (symbolCount === 1) score -= 3;

  if (strokeMetrics.maxStrokeCount >= 20) score -= 16;
  else if (strokeMetrics.maxStrokeCount >= 16) score -= 11;
  else if (strokeMetrics.maxStrokeCount >= 14) score -= 7;

  if (strokeMetrics.denseKanjiCount >= 2) score -= 10;
  else if (strokeMetrics.denseKanjiCount === 1) score -= 5;

  if (config.fontWeight < 400) score -= 12;
  if (config.fontWeight >= 900 && strokeMetrics.denseKanjiCount > 0) score -= 10;
  if (config.stroke1Enabled && config.stroke1Width >= 8 && strokeMetrics.denseKanjiCount > 0) score -= 9;
  if (!config.stroke2Enabled || config.stroke2Width <= 1) score -= 14;
  else if (config.stroke2Width < 8) score -= 7;
  else if (config.stroke2Width <= 14) score += 6;

  if (Math.abs(config.letterSpacing) > 20) score -= 8;
  else if (Math.abs(config.letterSpacing) > 12) score -= 4;

  if (Math.abs(config.spacing) > 48) score -= 7;
  if (config.condense < 72 || config.condense > 132) score -= 9;
  else if (config.condense < 82 || config.condense > 122) score -= 4;

  return Math.round(clamp(score, 0, 100));
};
