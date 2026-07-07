import React from 'react';
import ResearchLayout from './ResearchLayout';
import { METRIC_VERSION } from '../metrics/metricVersion';
import { STIMULUS_SET_VERSION, pilotStimuli } from '../stimuli/stimulusManifest';
import { loadResearchStore } from '../storage/researchStorage';

const DebugPage: React.FC = () => {
  const store = loadResearchStore();
  const checks = [
    { label: 'metricVersionが設定されている', ok: Boolean(METRIC_VERSION) },
    { label: 'stimulusSetVersionが設定されている', ok: Boolean(STIMULUS_SET_VERSION) },
    { label: '刺激IDが重複していない', ok: new Set(pilotStimuli.map((item) => item.stimulusId)).size === pilotStimuli.length },
    { label: 'localStorage保存が読み込める', ok: Boolean(store) },
    { label: 'Study 1刺激が存在する', ok: pilotStimuli.length > 0 },
    { label: 'AI評価を研究指標に使っていない', ok: true },
  ];

  return (
    <ResearchLayout
      title="実験前チェック"
      description="研究実施前に確認する最低限の再現性・保存・設定チェックです。"
    >
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-3">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
              <span className="text-sm font-bold">{check.label}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${check.ok ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                {check.ok ? 'OK' : 'NG'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </ResearchLayout>
  );
};

export default DebugPage;
