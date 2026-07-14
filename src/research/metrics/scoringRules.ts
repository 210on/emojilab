import { EmojiConfig, ScoreMetrics } from '../../../types';
import { RuleBasedMetrics } from '../types';
import { calculateDesignScore, calculateScoreMetrics, PreviewSurfaceSet } from './designScore';
import { METRIC_VERSION } from './metricVersion';

export const calculateMathMetrics = (
  config: EmojiConfig,
  surfaces?: Partial<PreviewSurfaceSet>,
): ScoreMetrics => calculateScoreMetrics(config, surfaces);

export const calculateRuleBasedMetrics = (config: EmojiConfig): RuleBasedMetrics => {
  const designScore = calculateDesignScore(config);
  const contrastScore = designScore.contrastFitScore;
  const scalabilityScore = designScore.scalabilityScore;
  const geometryPenalty =
    designScore.scalabilityPenalties.widthTransform +
    designScore.scalabilityPenalties.letterSpacing +
    designScore.scalabilityPenalties.lineSpacing +
    designScore.scalabilityPenalties.lineBalance +
    designScore.scalabilityPenalties.aspectRatio;
  const totalSupportScore = designScore.total;
  const status =
    totalSupportScore >= 80
      ? 'excellent'
      : totalSupportScore >= 70
        ? 'good'
        : 'needsWork';

  return {
    contrastScore,
    scalabilityScore,
    geometryPenalty: Number(geometryPenalty.toFixed(1)),
    totalSupportScore,
    status,
    metricVersion: METRIC_VERSION,
  };
};
