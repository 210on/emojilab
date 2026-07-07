import { ExperimentSession, ParticipantProfile, ResearchEventLog, ResearchStore, Study1Response } from '../types';

const RESEARCH_STORAGE_KEY = 'emojilab-research-store-v1';

const emptyStore = (): ResearchStore => ({
  sessions: [],
  profiles: [],
  study1Responses: [],
  eventLogs: [],
});

export const loadResearchStore = (): ResearchStore => {
  try {
    const raw = localStorage.getItem(RESEARCH_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<ResearchStore>;
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      study1Responses: Array.isArray(parsed.study1Responses) ? parsed.study1Responses : [],
      eventLogs: Array.isArray(parsed.eventLogs) ? parsed.eventLogs : [],
    };
  } catch (error) {
    console.warn('Failed to load research store:', error);
    return emptyStore();
  }
};

export const saveResearchStore = (store: ResearchStore) => {
  localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(store));
};

const updateStore = (updater: (store: ResearchStore) => ResearchStore) => {
  const next = updater(loadResearchStore());
  saveResearchStore(next);
  return next;
};

export const upsertSession = (session: ExperimentSession) =>
  updateStore((store) => ({
    ...store,
    sessions: [session, ...store.sessions.filter((item) => item.sessionId !== session.sessionId)],
  }));

export const upsertProfile = (profile: ParticipantProfile) =>
  updateStore((store) => ({
    ...store,
    profiles: [profile, ...store.profiles.filter((item) => item.participantId !== profile.participantId)],
  }));

export const appendStudy1Response = (response: Study1Response) =>
  updateStore((store) => ({
    ...store,
    study1Responses: [...store.study1Responses.filter((item) => item.trialId !== response.trialId), response],
  }));

export const appendEventLog = (event: ResearchEventLog) =>
  updateStore((store) => ({
    ...store,
    eventLogs: [...store.eventLogs, event],
  }));

export const clearResearchStore = () => {
  localStorage.removeItem(RESEARCH_STORAGE_KEY);
};
