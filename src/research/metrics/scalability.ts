import { EmojiConfig } from '../../../types';

export const calculateScalability = (config: EmojiConfig): number => {
  let score = 100;
  const charCount = config.textTop.length + config.textBottom.length;

  if (charCount > 2) score -= (charCount - 2) * 12;
  if (config.fontWeight < 400) score -= 20;
  if (config.fontWeight >= 700) score += 5;

  if (config.stroke1Enabled && config.stroke1Width > 8 && config.fontWeight > 500) {
    score -= 15;
  }

  if (!config.stroke2Enabled || config.stroke2Width <= 1) {
    score -= 10;
  } else if (config.stroke2Width < 8) {
    score -= 4;
  } else if (config.stroke2Width <= 14) {
    score += 10;
  } else {
    score += 4;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};
