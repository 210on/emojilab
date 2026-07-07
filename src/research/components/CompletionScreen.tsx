import React from 'react';

interface CompletionScreenProps {
  responseCount: number;
  onDownloadJson: () => void;
  onDownloadCsv: () => void;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({ responseCount, onDownloadJson, onDownloadCsv }) => (
  <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Complete</p>
    <h1 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">回答が完了しました</h1>
    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{responseCount}件の回答がブラウザ内に保存されています。</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <button type="button" onClick={onDownloadCsv} className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-white">
        CSVをダウンロード
      </button>
      <button type="button" onClick={onDownloadJson} className="rounded-2xl border border-neutral-200 px-5 py-3 text-sm font-black text-neutral-800 dark:border-neutral-700 dark:text-neutral-100">
        JSONをダウンロード
      </button>
    </div>
  </section>
);

export default CompletionScreen;
