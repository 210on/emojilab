import React from 'react';
import ResearchLayout from './ResearchLayout';
import { METRIC_VERSION } from '../metrics/metricVersion';
import { STIMULUS_SET_VERSION, pilotStimuli } from '../stimuli/stimulusManifest';
import ResearchEmojiPreview from '../components/ResearchEmojiPreview';
import ColorContrastChart from '../components/ColorContrastChart';

const ResearchAdminPage: React.FC = () => (
  <ResearchLayout
    title="研究管理"
    description="研究用の刺激セット、指標バージョン、実験ルートを確認するための入口です。初期実装では外部DBを使わず、ブラウザ内保存とファイル出力で運用します。"
  >
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-black">バージョン固定</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800">
            <dt className="font-bold text-neutral-500">metricVersion</dt>
            <dd className="mt-1 font-black">{METRIC_VERSION}</dd>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800">
            <dt className="font-bold text-neutral-500">stimulusSetVersion</dt>
            <dd className="mt-1 font-black">{STIMULUS_SET_VERSION}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-black">Pilot Stimuli</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {pilotStimuli.map((stimulus) => (
            <article key={stimulus.stimulusId} className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
              <ResearchEmojiPreview config={stimulus.emojiConfig} size={72} />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">{stimulus.label}</p>
                  <p className="text-xs text-neutral-500">{stimulus.stimulusId}</p>
                </div>
                <p className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black dark:bg-neutral-800">
                  {stimulus.metrics.totalSupportScore}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>

    <div className="mt-4">
      <ColorContrastChart />
    </div>
  </ResearchLayout>
);

export default ResearchAdminPage;
