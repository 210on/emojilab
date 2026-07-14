import { EmojiConfig } from '../../types';

export type StudyId = 'study1' | 'study2' | 'third-party-evaluation';
export type Likert7 = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ExperimentSession {
  sessionId: string;
  participantId: string;
  studyId: StudyId;
  condition?: string;
  startedAt: string;
  completedAt?: string;
  appVersion: string;
  metricVersion: string;
  stimulusSetVersion: string;
  userAgent: string;
  screen: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  consentAccepted: boolean;
}

export interface ParticipantProfile {
  participantId: string;
  ageRange: '18-19' | '20-24' | '25-29' | '30-39' | '40-49' | '50+';
  japaneseUsage: 'native' | 'daily' | 'limited';
  customEmojiExperience: 'none' | 'viewed' | 'used' | 'created';
  slackExperience: 'none' | 'viewer' | 'user' | 'admin_or_creator';
  discordExperience: 'none' | 'viewer' | 'user' | 'admin_or_creator';
  designExperience: 'none' | 'beginner' | 'intermediate' | 'advanced';
}

export type ResearchEventType =
  | 'trial_start'
  | 'trial_submit'
  | 'config_change'
  | 'preview_view'
  | 'feedback_view'
  | 'export'
  | 'undo'
  | 'save'
  | 'break_start'
  | 'break_end';

export interface ResearchEventLog {
  eventId: string;
  sessionId: string;
  participantId: string;
  studyId: string;
  timestamp: string;
  elapsedMs: number;
  eventType: ResearchEventType;
  payload: Record<string, unknown>;
}

export interface RuleBasedMetrics {
  contrastScore: number;
  scalabilityScore: number;
  geometryPenalty: number;
  totalSupportScore: number;
  status: 'excellent' | 'good' | 'needsWork';
  metricVersion: string;
}

export interface StimulusDefinition {
  stimulusId: string;
  label: string;
  intendedText: string;
  intendedMeaning: string;
  category: 'reply' | 'thanks' | 'status' | 'emotion' | 'community';
  emojiConfig: EmojiConfig;
  metrics: RuleBasedMetrics;
  factors: {
    characterCount: number;
    scriptType: Array<'hiragana' | 'katakana' | 'kanji' | 'latin' | 'symbol'>;
    backgroundCondition: 'light' | 'dark' | 'mixed';
    contrastBand: 'low' | 'medium' | 'high';
    outlineCondition: 'none' | 'single' | 'double';
    complexityBand: 'low' | 'medium' | 'high';
  };
}

export interface Study1Trial {
  trialId: string;
  stimulusId: string;
  blockIndex: number;
  trialIndex: number;
  presentedAt: string;
  responseStartedAt?: string;
  submittedAt?: string;
  displayCondition: {
    sizePx: number;
    background: 'light' | 'dark' | 'chat-light' | 'chat-dark';
  };
}

export interface Study1Response {
  sessionId: string;
  participantId: string;
  trialId: string;
  stimulusId: string;
  stimulusSetVersion: string;
  metricVersion: string;
  displaySizePx: number;
  backgroundCondition: string;
  contrastScore: number;
  scalabilityScore: number;
  geometryPenalty: number;
  /** Retained only when older metric versions are imported. */
  compositionScore?: number;
  totalSupportScore: number;
  legibilityRating: Likert7;
  meaningClarityRating: Likert7;
  confidenceRating: Likert7;
  meaningFreeText: string;
  transcriptionText?: string;
  responseTimeMs: number;
  submittedAt: string;
}

export interface ResearchStore {
  sessions: ExperimentSession[];
  profiles: ParticipantProfile[];
  study1Responses: Study1Response[];
  eventLogs: ResearchEventLog[];
}
