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
  const compositionScore = designScore.compositionScore;
  const totalSupportScore = designScore.total;
  const status =
    designScore.displayedContrastLc >= 75 && scalabilityScore >= 82 && totalSupportScore >= 84
      ? 'excellent'
      : designScore.displayedContrastLc >= 60 && scalabilityScore >= 72 && totalSupportScore >= 70
        ? 'good'
        : 'needsWork';

  return {
    contrastScore,
    scalabilityScore,
    compositionScore,
    totalSupportScore,
    status,
    metricVersion: METRIC_VERSION,
  };
};
