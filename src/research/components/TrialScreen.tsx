import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Likert7, StimulusDefinition, Study1Response, Study1Trial } from '../types';
import { nowIso } from '../utils/timestamp';
import RatingScale from './RatingScale';
import ProgressIndicator from './ProgressIndicator';
import ResearchEmojiPreview from './ResearchEmojiPreview';

interface TrialScreenProps {
  sessionId: string;
  participantId: string;
  stimulusSetVersion: string;
  trial: Study1Trial;
  stimulus: StimulusDefinition;
  currentIndex: number;
  total: number;
  onSubmit: (response: Study1Response) => void;
}

const TrialScreen: React.FC<TrialScreenProps> = ({
  sessionId,
  participantId,
  stimulusSetVersion,
  trial,
  stimulus,
  currentIndex,
  total,
  onSubmit,
}) => {
  const startedAtRef = useRef(performance.now());
  const [legibilityRating, setLegibilityRating] = useState<Likert7 | null>(null);
  const [meaningClarityRating, setMeaningClarityRating] = useState<Likert7 | null>(null);
  const [confidenceRating, setConfidenceRating] = useState<Likert7 | null>(null);
  const [meaningFreeText, setMeaningFreeText] = useState('');
  const [transcriptionText, setTranscriptionText] = useState('');

  useEffect(() => {
    startedAtRef.current = performance.now();
    setLegibilityRating(null);
    setMeaningClarityRating(null);
    setConfidenceRating(null);
    setMeaningFreeText('');
    setTranscriptionText('');
  }, [trial.trialId]);

  const canSubmit = useMemo(
    () => legibilityRating !== null && meaningClarityRating !== null && confidenceRating !== null,
    [confidenceRating, legibilityRating, meaningClarityRating],
  );

  return (
    <section className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <ProgressIndicator current={currentIndex + 1} total={total} />
        <div className="mt-5">
          <ResearchEmojiPreview
            config={stimulus.emojiConfig}
            size={trial.displayCondition.sizePx * 2}
            background={trial.displayCondition.background}
          />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-xs font-bold text-neutral-500">
          <div className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800">
            <dt>表示サイズ</dt>
            <dd className="mt-1 text-base text-neutral-950 dark:text-white">{trial.displayCondition.sizePx}px</dd>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800">
            <dt>背景条件</dt>
            <dd className="mt-1 text-base text-neutral-950 dark:text-white">{trial.displayCondition.background}</dd>
          </div>
        </dl>
      </div>

      <form
        className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit || legibilityRating === null || meaningClarityRating === null || confidenceRating === null) return;

          onSubmit({
            sessionId,
            participantId,
            trialId: trial.trialId,
            stimulusId: stimulus.stimulusId,
            stimulusSetVersion,
            metricVersion: stimulus.metrics.metricVersion,
            displaySizePx: trial.displayCondition.sizePx,
            backgroundCondition: trial.displayCondition.background,
            contrastScore: stimulus.metrics.contrastScore,
            scalabilityScore: stimulus.metrics.scalabilityScore,
            geometryPenalty: stimulus.metrics.geometryPenalty,
            totalSupportScore: stimulus.metrics.totalSupportScore,
            legibilityRating,
            meaningClarityRating,
            confidenceRating,
            meaningFreeText,
            transcriptionText,
            responseTimeMs: Math.round(performance.now() - startedAtRef.current),
            submittedAt: nowIso(),
          });
        }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Trial {currentIndex + 1}</p>
        <h1 className="mt-2 text-xl font-black text-neutral-950 dark:text-white">この絵文字を評価してください</h1>

        <div className="mt-5 space-y-4">
          <RatingScale
            label="文字や形の判別しやすさ"
            value={legibilityRating}
            lowLabel="分かりにくい"
            highLabel="分かりやすい"
            onChange={setLegibilityRating}
          />
          <RatingScale
            label="意味の分かりやすさ"
            value={meaningClarityRating}
            lowLabel="分かりにくい"
            highLabel="分かりやすい"
            onChange={setMeaningClarityRating}
          />
          <RatingScale
            label="解釈への自信"
            value={confidenceRating}
            lowLabel="自信がない"
            highLabel="自信がある"
            onChange={setConfidenceRating}
          />

          <label className="grid gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
            何を表していると思いましたか
            <textarea
              value={meaningFreeText}
              onChange={(event) => setMeaningFreeText(event.target.value)}
              className="min-h-20 rounded-2xl border border-neutral-200 bg-white p-3 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
            読めた文字があれば入力してください
            <input
              value={transcriptionText}
              onChange={(event) => setTranscriptionText(event.target.value)}
              className="rounded-2xl border border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          回答を送信
        </button>
      </form>
    </section>
  );
};

export default TrialScreen;
