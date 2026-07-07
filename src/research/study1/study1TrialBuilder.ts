import { shuffleWithSeed } from '../utils/randomSeed';
import { Study1Trial } from '../types';
import { study1Config } from './study1Config';

export const buildStudy1Trials = (participantId: string, seed = participantId): Study1Trial[] => {
  const orderedStimuli = shuffleWithSeed(study1Config.stimuli, `${seed}:stimuli`);
  const orderedBackgrounds = shuffleWithSeed([...study1Config.backgrounds], `${seed}:backgrounds`);

  return orderedStimuli.map((stimulus, index) => ({
    trialId: `study1-${participantId}-${String(index + 1).padStart(3, '0')}`,
    stimulusId: stimulus.stimulusId,
    blockIndex: 0,
    trialIndex: index,
    presentedAt: '',
    displayCondition: {
      sizePx: study1Config.displaySizes[index % study1Config.displaySizes.length],
      background: orderedBackgrounds[index % orderedBackgrounds.length],
    },
  }));
};
