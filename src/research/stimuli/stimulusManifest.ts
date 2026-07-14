import { EmojiConfig } from '../../../types';
import { calculateRuleBasedMetrics } from '../metrics/scoringRules';
import { StimulusDefinition } from '../types';

export const STIMULUS_SET_VERSION = 'stimulus-set-v1-pilot';

const baseConfig: EmojiConfig = {
  textTop: '確認',
  textBottom: '中',
  lineSizeBalance: 0,
  fontFamily: "'LINE Seed JP', sans-serif",
  fontWeight: 700,
  condense: 100,
  letterSpacing: 0,
  mainColor: '#FF9914',
  textAlign: 'center',
  stroke1Enabled: true,
  stroke1Color: '#000000',
  stroke1Width: 4,
  stroke2Enabled: true,
  stroke2Color: '#FFFFFF',
  stroke2Width: 10,
  autoSquare: false,
  spacing: -50,
};

const makeStimulus = (
  stimulusId: string,
  label: string,
  intendedText: string,
  intendedMeaning: string,
  emojiConfig: EmojiConfig,
): StimulusDefinition => ({
  stimulusId,
  label,
  intendedText,
  intendedMeaning,
  category: 'reply',
  emojiConfig,
  metrics: calculateRuleBasedMetrics(emojiConfig),
  factors: {
    characterCount: [...`${emojiConfig.textTop}${emojiConfig.textBottom}`].length,
    scriptType: ['kanji', 'hiragana'],
    backgroundCondition: 'mixed',
    contrastBand: emojiConfig.stroke2Enabled ? 'high' : 'medium',
    outlineCondition: emojiConfig.stroke1Enabled && emojiConfig.stroke2Enabled ? 'double' : 'single',
    complexityBand: intendedText.length >= 5 ? 'high' : intendedText.length >= 3 ? 'medium' : 'low',
  },
});

export const pilotStimuli: StimulusDefinition[] = [
  makeStimulus('pilot-001', '確認中', '確認中', '確認している状態', {
    ...baseConfig,
    textTop: '確認',
    textBottom: '中',
    mainColor: '#FF9914',
  }),
  makeStimulus('pilot-002', 'ありがとう', 'ありがとう', '感謝を伝える', {
    ...baseConfig,
    textTop: 'あり',
    textBottom: 'がと',
    mainColor: '#FFF231',
    stroke2Width: 10,
  }),
  makeStimulus('pilot-003', '対応お願いします', '対応お願いします', '対応依頼', {
    ...baseConfig,
    textTop: '対応',
    textBottom: 'お願い',
    mainColor: '#386CB0',
    stroke2Width: 12,
    spacing: -60,
  }),
  makeStimulus('pilot-004', '最高', '最高', '強い肯定感', {
    ...baseConfig,
    textTop: '最',
    textBottom: '高',
    mainColor: '#DF4C94',
    stroke1Width: 5,
  }),
  makeStimulus('pilot-005', 'OK', 'OK', '了承', {
    ...baseConfig,
    textTop: 'OK',
    textBottom: '!!',
    mainColor: '#33A65E',
    condense: 105,
  }),
  makeStimulus('pilot-006', '要確認', '要確認', '注意して確認が必要', {
    ...baseConfig,
    textTop: '要',
    textBottom: '確認',
    mainColor: '#F9344C',
    stroke1Width: 7,
    stroke2Width: 8,
  }),
];
