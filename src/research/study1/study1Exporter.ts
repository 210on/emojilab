import { Study1Response } from '../types';
import { toCsv } from '../storage/csvExport';

const study1Headers: Array<keyof Study1Response & string> = [
  'sessionId',
  'participantId',
  'trialId',
  'stimulusId',
  'stimulusSetVersion',
  'metricVersion',
  'displaySizePx',
  'backgroundCondition',
  'contrastScore',
  'scalabilityScore',
  'geometryPenalty',
  'compositionScore',
  'totalSupportScore',
  'legibilityRating',
  'meaningClarityRating',
  'confidenceRating',
  'meaningFreeText',
  'transcriptionText',
  'responseTimeMs',
  'submittedAt',
];

export const exportStudy1ResponsesCsv = (responses: Study1Response[]) =>
  toCsv(responses as unknown as Record<string, unknown>[], study1Headers, { bom: true });
