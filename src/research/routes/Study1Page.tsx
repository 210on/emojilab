import React, { useMemo, useState } from 'react';
import CompletionScreen from '../components/CompletionScreen';
import ConsentScreen from '../components/ConsentScreen';
import ParticipantInfoForm from '../components/ParticipantInfoForm';
import TrialScreen from '../components/TrialScreen';
import ResearchLayout from './ResearchLayout';
import { METRIC_VERSION } from '../metrics/metricVersion';
import { appendEventLog, appendStudy1Response, loadResearchStore, upsertProfile, upsertSession } from '../storage/researchStorage';
import { downloadTextFile } from '../storage/downloadFile';
import { toPrettyJson } from '../storage/jsonExport';
import { createEventId, createParticipantId, createSessionId } from '../utils/participantId';
import { nowIso, getDateStamp } from '../utils/timestamp';
import { getScreenInfo, getUserAgent } from '../utils/browserInfo';
import { study1Config } from '../study1/study1Config';
import { buildStudy1Trials } from '../study1/study1TrialBuilder';
import { exportStudy1ResponsesCsv } from '../study1/study1Exporter';
import { ExperimentSession, ParticipantProfile, Study1Response } from '../types';

type Step = 'consent' | 'profile' | 'trials' | 'complete';

const APP_VERSION = '0.0.0';

const Study1Page: React.FC = () => {
  const [participantId] = useState(() => createParticipantId());
  const [sessionId] = useState(() => createSessionId());
  const [step, setStep] = useState<Step>('consent');
  const [trialIndex, setTrialIndex] = useState(0);
  const [responses, setResponses] = useState<Study1Response[]>([]);
  const trials = useMemo(() => buildStudy1Trials(participantId), [participantId]);
  const currentTrial = trials[trialIndex];
  const currentStimulus = study1Config.stimuli.find((stimulus) => stimulus.stimulusId === currentTrial?.stimulusId);

  const createSession = (consentAccepted: boolean): ExperimentSession => ({
    sessionId,
    participantId,
    studyId: 'study1',
    startedAt: nowIso(),
    appVersion: APP_VERSION,
    metricVersion: METRIC_VERSION,
    stimulusSetVersion: study1Config.stimulusSetVersion,
    userAgent: getUserAgent(),
    screen: getScreenInfo(),
    consentAccepted,
  });

  const handleConsent = () => {
    upsertSession(createSession(true));
    setStep('profile');
  };

  const handleProfile = (profile: ParticipantProfile) => {
    upsertProfile(profile);
    setStep('trials');
  };

  const handleSubmitTrial = (response: Study1Response) => {
    appendStudy1Response(response);
    appendEventLog({
      eventId: createEventId(),
      sessionId,
      participantId,
      studyId: 'study1',
      timestamp: nowIso(),
      elapsedMs: response.responseTimeMs,
      eventType: 'trial_submit',
      payload: {
        trialId: response.trialId,
        stimulusId: response.stimulusId,
      },
    });

    setResponses((prev) => [...prev, response]);

    if (trialIndex + 1 >= trials.length) {
      upsertSession({
        ...createSession(true),
        completedAt: nowIso(),
      });
      setStep('complete');
      return;
    }

    setTrialIndex((prev) => prev + 1);
  };

  const downloadJson = () => {
    const store = loadResearchStore();
    downloadTextFile(
      `study1_session_${getDateStamp()}_${participantId}.json`,
      toPrettyJson({
        session: store.sessions.find((session) => session.sessionId === sessionId),
        profile: store.profiles.find((profile) => profile.participantId === participantId),
        trials,
        responses,
      }),
      'application/json;charset=utf-8',
    );
  };

  const downloadCsv = () => {
    downloadTextFile(
      `study1_responses_${getDateStamp()}_${participantId}.csv`,
      exportStudy1ResponsesCsv(responses),
      'text/csv;charset=utf-8',
    );
  };

  return (
    <ResearchLayout
      title="Study 1 視認性評価"
      description="システム指標と人間評価の対応を確認するための、刺激提示・7件法評価・自由記述の最小実験フローです。"
    >
      {step === 'consent' && <ConsentScreen onAccept={handleConsent} />}
      {step === 'profile' && <ParticipantInfoForm participantId={participantId} onSubmit={handleProfile} />}
      {step === 'trials' && currentTrial && currentStimulus && (
        <TrialScreen
          sessionId={sessionId}
          participantId={participantId}
          stimulusSetVersion={study1Config.stimulusSetVersion}
          trial={currentTrial}
          stimulus={currentStimulus}
          currentIndex={trialIndex}
          total={trials.length}
          onSubmit={handleSubmitTrial}
        />
      )}
      {step === 'complete' && (
        <CompletionScreen responseCount={responses.length} onDownloadCsv={downloadCsv} onDownloadJson={downloadJson} />
      )}
    </ResearchLayout>
  );
};

export default Study1Page;
