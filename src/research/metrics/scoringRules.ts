import { EmojiConfig, ScoreMetrics } from '../../../types';
import { RuleBasedMetrics } from '../types';
import { calculateAPCA } from './contrast';
import { METRIC_VERSION } from './metricVersion';
import { calculateScalability } from './scalability';
import { calculateComposition } from './composition';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeContrastScore = (contrastRatio: number) => {
  if (contrastRatio >= 75) {
    return 88 + Math.min(12, (contrastRatio - 75) * 0.8);
  }

  if (contrastRatio >= 45) {
    return 55 + (contrastRatio - 45) * 1.1;
  }

  return Math.max(12, 20 + contrastRatio * 0.75);
};

export const calculateMathMetrics = (config: EmojiConfig): Pick<ScoreMetrics, 'contrastRatio' | 'scalability'> => {
  const scalability = calculateScalability(config);
  let contrastRatio = 0;

  if (config.stroke2Enabled && config.stroke2Width >= 8) {
    contrastRatio = calculateAPCA(config.mainColor, config.stroke2Color);
  } else if (config.stroke1Enabled && config.stroke1Width > 2) {
    contrastRatio = calculateAPCA(config.mainColor, config.stroke1Color);
  } else if (config.stroke2Enabled && config.stroke2Width > 2) {
    contrastRatio = calculateAPCA(config.mainColor, config.stroke2Color);
  } else {
    const onWhite = calculateAPCA(config.mainColor, '#FFFFFF');
    const onBlack = calculateAPCA(config.mainColor, '#000000');
    contrastRatio = Math.min(onWhite, onBlack);
  }

  return {
    contrastRatio: Math.round(contrastRatio),
    scalability,
  };
};

export const calculateRuleBasedMetrics = (config: EmojiConfig): RuleBasedMetrics => {
  const mathMetrics = calculateMathMetrics(config);
  const contrastScore = Math.round(normalizeContrastScore(mathMetrics.contrastRatio));
  const scalabilityScore = mathMetrics.scalability;
  const compositionScore = calculateComposition(config);
  const totalSupportScore = Math.round(clamp(
    contrastScore * 0.45 + scalabilityScore * 0.35 + compositionScore * 0.2,
    0,
    100,
  ));

  return {
    contrastScore,
    scalabilityScore,
    compositionScore,
    totalSupportScore,
    status: totalSupportScore >= 90 ? 'excellent' : totalSupportScore >= 70 ? 'good' : 'needsWork',
    metricVersion: METRIC_VERSION,
  };
};
