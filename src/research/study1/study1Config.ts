import { STIMULUS_SET_VERSION, pilotStimuli } from '../stimuli/stimulusManifest';

export const study1Config = {
  studyId: 'study1',
  protocolVersion: 'study1-protocol-v0.1.0',
  stimulusSetVersion: STIMULUS_SET_VERSION,
  displaySizes: [32, 48],
  backgrounds: ['chat-light', 'chat-dark'] as const,
  stimuli: pilotStimuli,
};
